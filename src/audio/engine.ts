import { Capacitor } from '@capacitor/core';
import { SoundTouchNode } from '@soundtouchjs/audio-worklet';
import processorUrl from '@soundtouchjs/audio-worklet/processor?url';
import { guess } from 'web-audio-beat-detector';
import type { Track, MixTransition, TransitionMode } from '../types/music';
import {
  ALBUM_GAP_SECONDS,
  AUTOMIX_MAX_SECONDS,
  AUTOMIX_MIN_SECONDS,
  MAX_CROSSFADE_SECONDS,
  MIN_CROSSFADE_SECONDS,
  autoMixAction,
  autoMixDuration,
  equalPowerCurves,
  genresCompatible,
  matchOctave,
  normalizeBpm,
  phraseAlignedDuration,
  planBeatSync,
  splitGenres,
  transitionProfile,
} from './crossfade';
import { detectKey, harmonicCost, harmonicFadeCap, type KeyEstimate } from './harmony';
import { analyzeTail, type TailInfo } from './tail';
import { estimateTempo, type TempoEstimate } from './tempo';

/** Préfixe analysé sur mobile : ~40–90 s de MP3, assez pour tempo et tonalité. */
const NATIVE_ANALYSIS_BYTES = 1_500_000;

/**
 * Moteur audio à double deck (Web Audio API).
 *
 * Deux `<audio>` alimentent chacun un GainNode -> AnalyserNode -> master.
 * L'Auto-Mix consiste à :
 *   1. préparer le titre suivant dans le deck idle (chargement anticipé) ;
 *   2. démarrer le fondu environ 10 s avant la fin du titre courant : la
 *      durée est fixée par l'algorithme (10–12 s, phrase alignée) et non
 *      réglée par l'utilisateur, en pilotant les deux gains avec des courbes à
 *      puissance constante (aucun trou de silence, aucun "creux" de volume) ;
 *   3. aligner les tempos : le titre sortant prend celui du suivant (±8 %,
 *      octave corrigée) et une pulsation entrante tombe sur sa grille
 *      (beat-sync). Les BPM viennent d'une analyse du signal
 *      (`web-audio-beat-detector`, repli sur src/audio/tempo.ts), la tonalité
 *      de `harmony.ts` ; un écart harmonique raccourcit le fondu pour éviter
 *      que ça « sonne faux ». Le tempo est étiré par SoundTouch (média
 *      rééchantillonné, hauteur inchangée) ; sans worklet disponible, lecture
 *      native et fondu simple.
 *
 * Comme Apple Music : deux titres d'un même album s'enchaînent sans mix
 * dynamique, une paire incompatible (tempo, genre, harmonie) donne un
 * enchaînement quasi direct, et le mode `crossfade` est un simple fondu de
 * durée fixe, sans traitement. Quand le tempo est connu, le début du fondu est
 * calé sur une frontière de phrase (4 mesures) plutôt que sur une durée brute,
 * et un silence final éventuel est sauté.
 *
 * shortcut: les flux doivent être servis avec des en-têtes CORS
 * (`Access-Control-Allow-Origin`), sinon la Web Audio API produit du silence
 * (le média est "tainted"). Passer un backend qui relaie les streams.
 */

const ARM_LEAD_SECONDS = 2.5; // marge de préparation avant la fin du titre
const LEAD_IN_SECONDS = 0.25; // démarrage anticipé du titre entrant
const TICK_MS = 100;

/** Genre du morceau. Le genre d'artiste est trop grossier (un rappeur peut
 * publier un chant) : sans genre de titre, on ne bloque pas le mix. */
function genresOf(track: Track | null): string[] {
  return track?.genre ? splitGenres(track.genre) : [];
}

/**
 * Phase du détecteur, seulement si son BPM concorde avec le BPM publié.
 * Un détecteur qui annonce 141 BPM pour un titre à 120 donne aussi une phase
 * fausse : mieux vaut supposer la grille alignée sur le début.
 */
function phaseFor(beat: TempoEstimate | null, apiBpm: number): number {
  if (!beat) return 0;
  if (!apiBpm) return beat.phase;
  return Math.abs(matchOctave(apiBpm, beat.bpm) / apiBpm - 1) <= 0.02 ? beat.phase : 0;
}

interface Deck {
  el: HTMLAudioElement;
  /** Source Web Audio du média (rebranchée sur SoundTouch si disponible). */
  source: MediaElementAudioSourceNode;
  /** Étirement temporel sans changement de hauteur (null = lecture native). */
  st: SoundTouchNode | null;
  /** Égalisation des graves (bass swap). */
  low: BiquadFilterNode;
  /** Passe-bas de fermeture (filter sweep). */
  lowpass: BiquadFilterNode;
  gain: GainNode;
  analyser: AnalyserNode;
  /** Send d'écho (echo out). */
  delay: DelayNode;
  feedback: GainNode;
  wet: GainNode;
  /** Vitesse de lecture courante (1 = normale, ajustée par le beat-sync). */
  rate: number;
  track: Track | null;
  /** URL du média chargé (clé du cache d'estimation de tempo). */
  url: string;
}

export interface EngineEvents {
  /** Position / durée Courantes. */
  onTime?: (position: number, duration: number) => void;
  /** Le titre courant s'est terminé (hors fondu). */
  onEnded?: () => void;
  /** Le fondu s'est terminé : le deck entrant devient le deck actif. */
  onSwapped?: () => void;
  /** Un fondu vient de commencer (indicateur « Mixage »). */
  onMixStart?: () => void;
  /** Le fondu est terminé ou annulé. */
  onMixEnd?: () => void;
  onError?: (message: string) => void;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private decks: Deck[] = [];
  private active = 0;
  private events: EngineEvents = {};

  private volume = 0.8;
  private muted = false;
  private mode: TransitionMode = 'off';
  private crossfadeSeconds = 8;
  private mixing = false;

  private nextTrack: Track | null = null;
  private nextUrl = '';
  private nextLoaded = false;

  /** Transition IA pour la paire (en cours) -> (suivant), null = mode classique. */
  private nextTransition: MixTransition | null = null;

  /** Tempo estimé par URL (null = non rythmique, voir tempo.ts). */
  private readonly beats = new Map<string, TempoEstimate | null>();
  /** Tonalité estimée par URL (null = indéterminée, voir harmony.ts). */
  private readonly keys = new Map<string, KeyEstimate | null>();
  /** Fin estimée par URL (null = analyse non concluante, voir tail.ts). */
  private readonly tails = new Map<string, TailInfo | null>();
  private readonly analyzing = new Set<string>();
  /** Une seule analyse à la fois : deux décodages simultanés saturent la mémoire Android. */
  private analysisQueue: Promise<void> = Promise.resolve();

  /** Branchement du worklet SoundTouch (une seule fois par contexte). */
  private shifters: Promise<void> | null = null;

  private armed = false;
  private fadePlan: { startAt: number; endAt: number; mixing: boolean } | null = null;
  private startTimer: number | null = null;

  private lastMedia = 0;
  private lastWall = 0;
  private lastEmit = 0;

  // ---------------------------------------------------------------- lifecycle

  attach(events: EngineEvents): void {
    this.events = events;
  }

  private ensureContext(): AudioContext {
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio API indisponible sur ce navigateur.");

    // `playback` : tampon de sortie plus large que le défaut `interactive`.
    // Sur Android WebView, le petit tampon provoque des craquements quand le
    // graphe (deux decks + SoundTouch) charge le thread audio.
    const ctx = new Ctor({ latencyHint: 'playback' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(ctx.destination);

    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.crossOrigin = 'anonymous';
      el.preload = 'auto';
      const source = ctx.createMediaElementSource(el);
      const low = ctx.createBiquadFilter();
      low.type = 'lowshelf';
      low.frequency.value = 160;
      low.gain.value = 0;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 20000;
      lowpass.Q.value = 0.7;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      // Chemin sec : EQ -> filtre -> fondu -> analyseur -> master.
      source.connect(low).connect(lowpass).connect(gain).connect(analyser).connect(this.master);

      // Send d'écho (contourne le fondu : la queue survit à la fin du fondu).
      const delay = ctx.createDelay(2);
      delay.delayTime.value = 0.3;
      const feedback = ctx.createGain();
      feedback.gain.value = 0;
      const wet = ctx.createGain();
      wet.gain.value = 0;
      lowpass.connect(delay);
      delay.connect(feedback).connect(delay);
      delay.connect(wet).connect(this.master);

      const deck: Deck = {
        el,
        source,
        st: null,
        low,
        lowpass,
        gain,
        analyser,
        delay,
        feedback,
        wet,
        rate: 1,
        track: null,
        url: '',
      };
      el.addEventListener('ended', () => this.onElementEnded(deck));
      el.addEventListener('error', () => {
        if (deck.track) this.events.onError?.(`Flux indisponible : ${deck.track.title}`);
      });
      this.decks.push(deck);
    }

    this.startTimer = window.setInterval(this.tick, TICK_MS);
    return ctx;
  }

  /**
   * Intercale SoundTouch entre chaque média et son égaliseur : le beat-sync
   * peut alors changer le tempo sans transposer (le média est rééchantillonné,
   * SoundTouch compense la hauteur). Une seule fois, decks à l'arrêt.
   */
  private prepareShifters(): Promise<void> {
    // Sur mobile, le média préserve lui-même la hauteur lors du beat-sync :
    // le worklet SoundTouch ajoute un traitement temps réel qui craque sur
    // certaines WebView Android. Le web garde SoundTouch.
    // shortcut: qualité de pitch native au lieu de SoundTouch sur mobile ;
    // réactiver le worklet si le rendu des tempos mobiles devient un problème.
    if (Capacitor.isNativePlatform()) return Promise.resolve();
    if (this.shifters) return this.shifters;
    const ctx = this.ctx;
    if (!ctx) return Promise.resolve();
    this.shifters = (async () => {
      try {
        await SoundTouchNode.register(ctx, processorUrl);
      } catch {
        return; // AudioWorklet indisponible : lecture native, hauteur préservée
      }
      for (const deck of this.decks) {
        if (deck.st) continue;
        try {
          const st = new SoundTouchNode({ context: ctx });
          deck.source.disconnect();
          deck.source.connect(st).connect(deck.low);
          deck.el.preservesPitch = false; // la hauteur est gérée par SoundTouch
          deck.st = st;
        } catch {
          /* ce deck reste en lecture native */
        }
      }
    })();
    return this.shifters;
  }

  /** Vitesse de lecture d'un deck : média + étirement temporel ensemble. */
  private setRate(deck: Deck, rate: number): void {
    deck.rate = rate;
    deck.el.playbackRate = rate;
    if (deck.st) deck.st.playbackRate.value = rate;
  }

  // ------------------------------------------------------------------ lecture

  async play(track: Track, url: string, startAt = 0): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    await this.prepareShifters();
    this.disarm();
    this.startBeatAnalysis(url); // tempo du sortant, prêt avant l'armement

    const deck = this.decks[this.active];
    this.resetFx(deck, ctx.currentTime);
    this.setRate(deck, 1);
    deck.track = track;
    await this.loadDeck(deck, url, startAt);

    const now = ctx.currentTime;
    deck.gain.gain.cancelScheduledValues(now);
    deck.gain.gain.setValueAtTime(1, now);
    await deck.el.play();
    this.anchorClock();
  }

  async resume(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    await this.decks[this.active].el.play();
    this.anchorClock();
  }

  pause(): void {
    this.decks[this.active].el.pause();
  }

  seek(seconds: number): void {
    const deck = this.decks[this.active];
    const duration = deck.el.duration || 0;
    const target = Math.max(0, Math.min(seconds, duration || seconds));
    try {
      deck.el.currentTime = target;
    } catch {
      /* média pas encore chargé : on ignore */
    }
    this.disarm(true);
    this.anchorClock();
  }

  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.applyMasterGain();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain();
  }

  private applyMasterGain(): void {
    if (!this.master || !this.ctx) return;
    const target = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
  }

  // ------------------------------------------------------------------ automix

  setTransition(mode: TransitionMode, crossfadeSeconds: number): void {
    this.mode = mode;
    this.crossfadeSeconds = Math.max(
      MIN_CROSSFADE_SECONDS,
      Math.min(MAX_CROSSFADE_SECONDS, crossfadeSeconds),
    );
    if (mode !== 'automix') {
      this.disarm();
      return;
    }
    // Réglage activé en cours de lecture : on lance les analyses maintenant,
    // sinon le premier fondu n'aurait aucun BPM disponible.
    this.startBeatAnalysis(this.decks[this.active]?.url ?? '');
    if (this.nextUrl) this.startBeatAnalysis(this.nextUrl);
  }

  /** Déclare le titre suivant : il est préchargé dans le deck idle. */
  /**
   * Applique le style du plan IA au titre déjà préchargé. Le plan arrive
   * souvent après `setNext` : sans cela, le premier fondu resterait neutre.
   */
  applyTransition(transition: MixTransition | null): void {
    if (this.armed) return; // un fondu en cours garde son style
    this.nextTransition = transition;
  }

  async setNext(track: Track | null, url: string, transition: MixTransition | null = null): Promise<void> {
    this.nextTrack = track;
    this.nextUrl = url;
    this.nextLoaded = false;
    this.nextTransition = transition;
    if (!track || !this.ctx) return;
    this.startBeatAnalysis(url); // tempo + tonalité du suivant, prêts avant l'armement
    const idle = this.decks[1 - this.active];
    try {
      await this.loadDeck(idle, url);
      this.nextLoaded = true;
    } catch {
      this.nextLoaded = false;
    }
  }

  /** Bascule l'indicateur « Mixage » et prévient le store au changement. */
  private setMixing(value: boolean): void {
    if (this.mixing === value) return;
    this.mixing = value;
    (value ? this.events.onMixStart : this.events.onMixEnd)?.();
  }

    /** Annule le fondu en cours (seek, changement de mode, changement de piste). */
    private disarm(keepTransition = false): void {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const out = this.decks[this.active];
      out.gain.gain.cancelScheduledValues(now);
      out.gain.gain.setValueAtTime(out.el.paused ? out.gain.gain.value : 1, now);
      // Le tempo ajusté (beat-sync) ne doit pas survivre à la transition.
      this.setRate(out, 1);
      const idle = this.decks[1 - this.active];
      idle.gain.gain.cancelScheduledValues(now);
      idle.gain.gain.setValueAtTime(0, now);
      this.setRate(idle, 1);
      this.resetFx(out, now);
      this.resetFx(idle, now);
      this.armed = false;
      this.fadePlan = null;
      this.setMixing(false);
      if (!keepTransition) this.nextTransition = null;
    }

  // -------------------------------------------------------------------- tick

  private tick = (): void => {
    if (!this.ctx || this.decks.length === 0) return;
    const deck = this.decks[this.active];
    const el = deck.el;
    const nowWall = performance.now() / 1000;

    // Ancre de lecture : suit les sauts réels de currentTime et interpole
    // entre deux ticks pour une barre de progression fluide.
    if (Math.abs(el.currentTime - this.lastMedia) > 0.001) this.anchorClock();
    const position = this.position();
    const duration = Number.isFinite(el.duration) ? el.duration : 0;

    if (nowWall - this.lastEmit > 0.2) {
      this.lastEmit = nowWall;
      this.events.onTime?.(position, duration);
    }

    // Début du fondu : on signale l'état « Mixage ».
    if (this.fadePlan?.mixing && !this.mixing && this.ctx.currentTime >= this.fadePlan.startAt) {
      this.setMixing(true);
    }

    // Fin du fondu : on bascule sur le deck entrant.
    if (this.armed && this.fadePlan && this.ctx.currentTime >= this.fadePlan.endAt) {
      this.swapDecks();
      return;
    }

    // Fenêtre de fondu : on prépare la transition. En AutoMix la durée est
    // musicale (jusqu'à 12 s), donc on arme plus tôt que pour un crossfade.
    if (this.mode !== 'off' && this.nextTrack && !this.armed && duration > 0) {
      // Un silence final appartient au fichier, pas au morceau : le fondu
      // s'arrête à la fin audible et saute ce silence.
      const tail = this.tails.get(deck.url) ?? null;
      const audibleEnd = duration - (tail?.kind === 'silent' ? tail.silence : 0);
      const remaining = (audibleEnd - position) / deck.rate;
      const window =
        (this.mode === 'crossfade' ? this.crossfadeSeconds : AUTOMIX_MAX_SECONDS) + ARM_LEAD_SECONDS;
      if (remaining <= window) {
        void this.armCrossfade(position, audibleEnd);
      }
    }
  };

  private anchorClock(): void {
    const el = this.decks[this.active].el;
    this.lastMedia = el.currentTime;
    this.lastWall = performance.now() / 1000;
  }

  private position(): number {
    const deck = this.decks[this.active];
    if (deck.el.paused) return deck.el.currentTime;
    const elapsed = performance.now() / 1000 - this.lastWall;
    const value = this.lastMedia + elapsed * deck.rate;
    const duration = deck.el.duration;
    return Number.isFinite(duration) ? Math.min(value, duration) : value;
  }

  getPosition(): number {
    return this.position();
  }

  getDuration(): number {
    const duration = this.decks[this.active]?.el.duration;
    return Number.isFinite(duration) ? duration : 0;
  }

  getSpectrum(target: Uint8Array<ArrayBuffer>): void {
    this.decks[this.active]?.analyser.getByteFrequencyData(target);
  }

  // -------------------------------------------------------------- crossfade

  private async armCrossfade(position: number, duration: number): Promise<void> {
    const ctx = this.ctx;
    if (!ctx || !this.nextTrack) return;
    this.armed = true;

    const outgoing = this.decks[this.active];
    const incoming = this.decks[1 - this.active];
    this.resetFx(outgoing, ctx.currentTime);

    // Le fondu ne peut pas dépasser la durée restante du titre sortant,
    // sinon la piste sortirait du fondu et laisserait un trou de silence.
    const remaining = Math.max(0, (duration - position) / outgoing.rate);
    // Le BPM publié fait foi. Le détecteur de signal dérive sur les morceaux
    // non carrés (141 BPM pour un titre annoncé à 120) ; il ne sert qu'en
    // secours quand la métadonnée manque.
    const outBeat = this.beats.get(outgoing.url) ?? null;
    const inBeat = this.beats.get(this.nextUrl) ?? null;
    const outApiBpm = normalizeBpm(outgoing.track?.bpm);
    const inApiBpm = normalizeBpm(this.nextTrack.bpm);
    const outBpm = outApiBpm || outBeat?.bpm || 0;
    const inBpm = matchOctave(outBpm, inApiBpm || inBeat?.bpm || 0);
    const outPhase = phaseFor(outBeat, outApiBpm);
    const inPhase = phaseFor(inBeat, inApiBpm);
    const knownTempo = outBpm > 0 && inBpm > 0;
    const sameAlbum =
      !!outgoing.track?.album?.id &&
      !!this.nextTrack.album?.id &&
      outgoing.track.album.id === this.nextTrack.album.id;
    const style = this.nextTransition?.style ?? null;
    const outKey = this.keys.get(outgoing.url) ?? null;
    const inKey = this.keys.get(this.nextUrl) ?? null;
    const harmonic = outKey && inKey ? harmonicCost(outKey, inKey) : null;
    const action =
      this.mode === 'crossfade'
        ? 'crossfade'
        : autoMixAction({
            sameAlbum,
            outBpm,
            inBpm,
            genreCompatible: genresCompatible(genresOf(outgoing.track), genresOf(this.nextTrack)),
            harmonic,
            style,
          });

    // AutoMix façon Apple Music : on ne mixe que si la paire s'y prête.
    // Sinon, enchaînement quasi direct (0,3 s), sans beat-match, sans
    // traitement de style et sans indicateur « Mixage ».
    let profile = 'crossfade';
    let beatSync = false;
    let showMixing = true;
    let fadeDuration: number;

    if (this.mode === 'crossfade') {
      fadeDuration = this.crossfadeSeconds;
    } else if (action !== 'mix') {
      fadeDuration = ALBUM_GAP_SECONDS;
      showMixing = false;
    } else {
      profile = style && style !== 'cut' ? style : 'blend';
      beatSync = knownTempo && this.nextTransition?.tempoSync !== false;
      fadeDuration = phraseAlignedDuration({
        position,
        duration,
        outBpm,
        outPhase,
        outRate: outgoing.rate,
        desired: autoMixDuration(outBpm),
        min: AUTOMIX_MIN_SECONDS,
        max: AUTOMIX_MAX_SECONDS,
      });
    }

    fadeDuration = Math.min(fadeDuration, remaining);

    // Harmonie : une tonalité voisine (coût 2) raccourcit le fondu ; une
    // dissonance (coût 3) a déjà été transformée en enchaînement ci-dessus.
    if (action === 'mix') {
      fadeDuration = harmonicFadeCap(fadeDuration, outKey, inKey);
    }

    if (fadeDuration <= 0.05) {
      this.armed = false;
      this.nextTransition = null;
      return;
    }

    // Les estimations de tempo sont lues sans await : si l'analyse n'est pas
    // terminée à l'armement, le plan dégrade proprement (fondu sans beat-sync).
    const plan = planBeatSync({
      position,
      duration,
      crossfade: fadeDuration,
      outBpm: beatSync ? outBpm : 0,
      inBpm: beatSync ? inBpm : 0,
      outPhase,
      inPhase,
      outRate: outgoing.rate,
      leadIn: LEAD_IN_SECONDS,
      inDuration: this.nextTrack.duration ?? 0,
    });

    // Le titre entrant doit être prêt : on charge si nécessaire.
    if (!this.nextLoaded) {
      try {
        await this.loadDeck(incoming, this.nextUrl);
        this.nextLoaded = true;
      } catch {
        this.armed = false; // on laisse le titre courant se terminer seul
        return;
      }
    }
    // Un seek, un changement de mode ou de piste a pu annuler le fondu pendant
    // le chargement : on ne planifie rien dans ce cas.
    if (!this.armed) return;

    const fadeStartAbs = ctx.currentTime + plan.fadeStart;
    const fadeEndAbs = fadeStartAbs + fadeDuration;
    this.fadePlan = { startAt: fadeStartAbs, endAt: fadeEndAbs, mixing: showMixing };

    // Démarrage du titre entrant légèrement avant le début du fondu : c'est
    // à cet instant que le sortant prend le tempo du suivant (±8 %).
    const delayMs = Math.max(0, plan.fadeStart - LEAD_IN_SECONDS) * 1000;
    window.setTimeout(() => {
      if (!this.armed) return;
      this.setRate(outgoing, plan.outgoingRate);
      void this.startIncoming(incoming, plan.inOffset, fadeStartAbs, fadeDuration, profile);
    }, delayMs);
  }

  private async startIncoming(
    deck: Deck,
    offset: number,
    fadeStartAbs: number,
    fadeDuration: number,
    profileStyle: string,
  ): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    const el = deck.el;

    // L'entrée joue à sa vitesse naturelle : c'est le sortant qui s'ajuste.
    this.setRate(deck, 1);
    if (offset > 0) {
      try {
        el.currentTime = offset;
      } catch {
        /* média pas prêt : on démarre au début */
      }
    }
    try {
      await el.play();
    } catch {
      // Le titre entrant n'a pas pu démarrer : on annule le fondu pour éviter
      // un silence, le titre courant ira jusqu'à son terme.
      this.armed = false;
      this.fadePlan = null;
      return;
    }

    const duration = fadeDuration;
    const { fadeIn, fadeOut } = equalPowerCurves(duration);
    const outgoing = this.decks[this.active];
    this.resetFx(deck, ctx.currentTime);

    outgoing.gain.gain.cancelScheduledValues(fadeStartAbs);
    outgoing.gain.gain.setValueAtTime(1, fadeStartAbs);
    outgoing.gain.gain.setValueCurveAtTime(fadeOut, fadeStartAbs, duration);

    deck.gain.gain.cancelScheduledValues(fadeStartAbs);
    deck.gain.gain.setValueAtTime(0, fadeStartAbs);
    deck.gain.gain.setValueCurveAtTime(fadeIn, fadeStartAbs, duration);

    // Traitement propre au style de transition (bass swap, filtre, écho).
    const profile = transitionProfile(
      profileStyle,
      this.beats.get(outgoing.url)?.bpm ?? outgoing.track?.bpm ?? 0,
      duration,
    );
    const fadeEndAbs = fadeStartAbs + duration;

    if (profile.outBassGain !== 0) {
      outgoing.low.gain.setValueAtTime(0, fadeStartAbs);
      outgoing.low.gain.linearRampToValueAtTime(profile.outBassGain, fadeStartAbs + duration * 0.5);
      deck.low.gain.setValueAtTime(profile.inBassGain, fadeStartAbs);
      deck.low.gain.linearRampToValueAtTime(0, fadeStartAbs + duration * 0.75);
    }

    if (profile.outLowpassEnd !== null) {
      outgoing.lowpass.frequency.setValueAtTime(20000, fadeStartAbs);
      outgoing.lowpass.frequency.exponentialRampToValueAtTime(
        profile.outLowpassEnd,
        fadeEndAbs,
      );
    }

    if (profile.echoWet > 0) {
      outgoing.delay.delayTime.setValueAtTime(profile.echoDelay, fadeStartAbs);
      outgoing.feedback.gain.setValueAtTime(0.38, fadeStartAbs);
      outgoing.wet.gain.setValueAtTime(0, fadeStartAbs);
      outgoing.wet.gain.linearRampToValueAtTime(profile.echoWet, fadeEndAbs);
    }
  }

  /** Remet à plat les traitements d'un deck (graves, passe-bas, écho). */
  private resetFx(deck: Deck, at: number, keepEcho = false): void {
    deck.low.gain.cancelScheduledValues(at);
    deck.low.gain.setValueAtTime(0, at);
    deck.lowpass.frequency.cancelScheduledValues(at);
    deck.lowpass.frequency.setValueAtTime(20000, at);
    deck.feedback.gain.cancelScheduledValues(at);
    deck.feedback.gain.setValueAtTime(0, at);
    if (!keepEcho) {
      deck.wet.gain.cancelScheduledValues(at);
      deck.wet.gain.setValueAtTime(0, at);
    }
  }

  private swapDecks(): void {
    const outgoing = this.decks[this.active];
    const incoming = this.decks[1 - this.active];
    const now = this.ctx?.currentTime ?? 0;

    outgoing.el.pause();
    try {
      outgoing.el.currentTime = 0;
    } catch {
      /* ignore */
    }
    outgoing.gain.gain.cancelScheduledValues(now);
    outgoing.gain.gain.setValueAtTime(1, now);
    // Filtres remis à plat tout de suite, mais la queue d'écho s'éteint en douceur.
    outgoing.low.gain.cancelScheduledValues(now);
    outgoing.low.gain.setValueAtTime(0, now);
    outgoing.lowpass.frequency.cancelScheduledValues(now);
    outgoing.lowpass.frequency.setValueAtTime(20000, now);
    outgoing.feedback.gain.cancelScheduledValues(now);
    outgoing.feedback.gain.setValueAtTime(0, now);
    outgoing.wet.gain.cancelScheduledValues(now);
    outgoing.wet.gain.setValueAtTime(outgoing.wet.gain.value, now);
    outgoing.wet.gain.linearRampToValueAtTime(0, now + 0.8);
    outgoing.track = null;
    // Repasse en vitesse naturelle (le tempo ajusté ne doit pas fuiter).
    this.setRate(outgoing, 1);

    this.active = 1 - this.active;
    incoming.gain.gain.cancelScheduledValues(now);
    incoming.gain.gain.setValueAtTime(1, now);

    this.armed = false;
    this.fadePlan = null;
    this.nextTrack = null;
    this.nextUrl = '';
    this.nextLoaded = false;
    this.nextTransition = null;
    this.anchorClock();
    this.setMixing(false);
    this.events.onSwapped?.();
  }

  private onElementEnded(deck: Deck): void {
    // Pendant un fondu, la fin du titre sortant est gérée par swapDecks().
    if (this.armed) return;
    if (deck !== this.decks[this.active]) return;
    this.events.onEnded?.();
  }

  // ------------------------------------------------------------------ helpers

  /**
   * Lance (une seule fois par URL) l'analyse du flux — tempo et tonalité ;
   * les résultats sont lus à l'armement du fondu, sans bloquer la lecture.
   */
  private startBeatAnalysis(url: string): void {
    if (!url || this.analyzing.has(url) || this.beats.has(url)) return;
    this.analyzing.add(url);
    this.analysisQueue = this.analysisQueue
      .then(() => this.analyze(url))
      .then(({ tempo, key, tail }) => {
        this.beats.set(url, tempo);
        this.keys.set(url, key);
        this.tails.set(url, tail);
      })
      .catch(() => {
        /* analyse impossible : fondu simple */
      })
      .finally(() => this.analyzing.delete(url));
  }

  private async analyze(
    url: string,
  ): Promise<{ tempo: TempoEstimate | null; key: KeyEstimate | null; tail: TailInfo | null }> {
    const ctx = this.ctx;
    if (!ctx) return { tempo: null, key: null, tail: null };
    const native = Capacitor.isNativePlatform();
    try {
      // Sur mobile, `decodeAudioData` du fichier entier (~1,7 Mo de PCM par
      // seconde) fait tuer la WebView par Android. Un préfixe suffit au tempo
      // et à la tonalité ; la fin (tail) n'est alors pas analysable.
      const response = await fetch(
        url,
        native
          ? { headers: { Range: `bytes=0-${NATIVE_ANALYSIS_BYTES - 1}` } }
          : undefined,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // shortcut: decodeAudioData décompresse tout le fichier en PCM flottant
      // (~1,7 Mo/s stéréo) ; pour des médias de plusieurs dizaines de minutes,
      // analyser un segment (en-tête Range) au lieu du fichier entier.
      const audio = await ctx.decodeAudioData(await response.arrayBuffer());
      const mono = audio.getChannelData(0);
      return {
        tempo: (await libraryTempo(audio)) ?? estimateTempo(mono, audio.sampleRate),
        key: detectKey(mono, audio.sampleRate),
        tail: native ? null : analyzeTail(mono, audio.sampleRate),
      };
    } catch {
      return { tempo: null, key: null, tail: null }; // flux non récupérable : fondu simple
    }
  }

  private async loadDeck(deck: Deck, url: string, startAt = 0): Promise<void> {
    const el = deck.el;
    deck.url = url;
    el.src = url;
    el.load();
    if (el.readyState < 1) await this.waitForMetadata(el);
    if (startAt > 0) el.currentTime = startAt;
  }

  private waitForMetadata(el: HTMLAudioElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        el.removeEventListener('loadedmetadata', onLoaded);
        el.removeEventListener('error', onError);
      };
      const onLoaded = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        reject(new Error('Métadonnées indisponibles'));
      };
      el.addEventListener('loadedmetadata', onLoaded);
      el.addEventListener('error', onError);
    });
  }

  dispose(): void {
    if (this.startTimer !== null) window.clearInterval(this.startTimer);
    this.decks.forEach((deck) => deck.el.pause());
    void this.ctx?.close();
  }
}

/**
 * BPM via `web-audio-beat-detector` (analyse spectrale, calculée en Worker).
 * L'algorithme sort parfois le double ou la moitié du tempo ressenti : on
 * ramène le résultat dans la plage 70–180 BPM, phase comprise.
 */
async function libraryTempo(buffer: AudioBuffer): Promise<TempoEstimate | null> {
  try {
    const { bpm, offset } = await guess(buffer);
    if (!Number.isFinite(bpm) || bpm <= 0) return null;
    const value = normalizeBpm(bpm);
    return { bpm: value, phase: offset % (60 / value), confidence: 1 };
  } catch {
    return null;
  }
}

/** Instance unique partagée par le store et l'UI. */
export const engine = new AudioEngine();
