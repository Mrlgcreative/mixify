import type { Track, MixTransition } from '../types/music';
import {
  MAX_CROSSFADE_SECONDS,
  MIN_CROSSFADE_SECONDS,
  equalPowerCurves,
  planBeatSync,
  resolveFadeDuration,
  transitionProfile,
} from './crossfade';
import { estimateTempo, type TempoEstimate } from './tempo';

/**
 * Moteur audio à double deck (Web Audio API).
 *
 * Deux `<audio>` alimentent chacun un GainNode -> AnalyserNode -> master.
 * L'Auto-Mix consiste à :
 *   1. préparer le titre suivant dans le deck idle (chargement anticipé) ;
 *   2. démarrer le fondu exactement `crossfade` secondes avant la fin du titre
 *      courant, en pilotant les deux gains avec des courbes à puissance
 *      constante (aucun trou de silence, aucune "creux" de volume) ;
 *   3. aligner les tempos : le titre sortant prend celui du suivant (±8 %)
 *      et une pulsation entrante tombe sur sa grille (beat-sync). Les BPM
 *      viennent de l'API si elle en fournit, sinon d'une estimation côté
 *      client (src/audio/tempo.ts) lancée au chargement de chaque flux ; sans
 *      BPM fiable, le fondu dégrade en puissance constante simple.
 *
 * shortcut: les flux doivent être servis avec des en-têtes CORS
 * (`Access-Control-Allow-Origin`), sinon la Web Audio API produit du silence
 * (le média est "tainted"). Passer un backend qui relaie les streams.
 */

const ARM_LEAD_SECONDS = 2.5; // marge de préparation avant la fin du titre
const LEAD_IN_SECONDS = 0.25; // démarrage anticipé du titre entrant
const TICK_MS = 100;

interface Deck {
  el: HTMLAudioElement;
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
  private autoMix = false;
  private crossfadeSeconds = 8;

  private nextTrack: Track | null = null;
  private nextUrl = '';
  private nextLoaded = false;

  /** Transition IA pour la paire (en cours) -> (suivant), null = mode classique. */
  private nextTransition: MixTransition | null = null;

  /** Tempo estimé par URL (null = non rythmique, voir tempo.ts). */
  private readonly beats = new Map<string, TempoEstimate | null>();
  private readonly analyzing = new Set<string>();

  private armed = false;
  private fadePlan: { startAt: number; endAt: number } | null = null;
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

    const ctx = new Ctor();
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

  // ------------------------------------------------------------------ lecture

  async play(track: Track, url: string, startAt = 0): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') await ctx.resume();
    this.disarm();
    this.startBeatAnalysis(url); // tempo du sortant, prêt avant l'armement

    const deck = this.decks[this.active];
    this.resetFx(deck, ctx.currentTime);
    deck.rate = 1;
    deck.el.playbackRate = 1;
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

  setAutoMix(enabled: boolean, crossfadeSeconds: number): void {
    this.autoMix = enabled;
    this.crossfadeSeconds = Math.max(
      MIN_CROSSFADE_SECONDS,
      Math.min(MAX_CROSSFADE_SECONDS, crossfadeSeconds),
    );
    if (!enabled || this.crossfadeSeconds === 0) {
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
    this.startBeatAnalysis(url); // tempo du suivant, prêt avant l'armement
    const idle = this.decks[1 - this.active];
    try {
      await this.loadDeck(idle, url);
      this.nextLoaded = true;
    } catch {
      this.nextLoaded = false;
    }
  }

    /** Annule le fondu en cours (seek, changement de mode, changement de piste). */
    private disarm(keepTransition = false): void {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const out = this.decks[this.active];
      out.gain.gain.cancelScheduledValues(now);
      out.gain.gain.setValueAtTime(out.el.paused ? out.gain.gain.value : 1, now);
      // Le tempo ajusté (beat-sync) ne doit pas survivre à la transition.
      out.rate = 1;
      out.el.playbackRate = 1;
      const idle = this.decks[1 - this.active];
      idle.gain.gain.cancelScheduledValues(now);
      idle.gain.gain.setValueAtTime(0, now);
      idle.rate = 1;
      idle.el.playbackRate = 1;
      this.resetFx(out, now);
      this.resetFx(idle, now);
      this.armed = false;
      this.fadePlan = null;
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

    // Fin du fondu : on bascule sur le deck entrant.
    if (this.armed && this.fadePlan && this.ctx.currentTime >= this.fadePlan.endAt) {
      this.swapDecks();
      return;
    }

    // Fenêtre de fondu : on prépare la transition.
    if (
      this.autoMix &&
      this.crossfadeSeconds > 0 &&
      this.nextTrack &&
      !this.armed &&
      duration > 0
    ) {
      const remaining = (duration - position) / deck.rate;
      if (remaining <= this.crossfadeSeconds + ARM_LEAD_SECONDS) {
        void this.armCrossfade(position, duration);
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
    const outBpm = outgoing.track?.bpm ?? 0;
    const inBpm = this.nextTrack.bpm ?? 0;
    const sameAlbum =
      !!outgoing.track?.album?.id &&
      !!this.nextTrack.album?.id &&
      outgoing.track.album.id === this.nextTrack.album.id;
    const sameArtist =
      !!outgoing.track?.artist?.id &&
      !!this.nextTrack.artist?.id &&
      outgoing.track.artist.id === this.nextTrack.artist.id;

    // AutoMix à la manière d'Apple Music :
    //  - album continu -> transitions très discrètes (ou quasi sans fondu)
    //  - écart de BPM important -> éviter un long fondu, privilégier un enchaînement plus sec
    let transition = this.nextTransition;
    if (!transition && sameAlbum) {
      transition = { style: 'blend', duration: 0.8, tempoSync: true, reason: null };
    } else if (!transition && sameArtist && Math.abs(outBpm - inBpm) > 14) {
      transition = { style: 'cut', duration: 0.08, tempoSync: false, reason: null };
    } else if (!transition && outgoing.track?.genre && this.nextTrack.genre && outgoing.track.genre === this.nextTrack.genre && !sameAlbum) {
      // Certains genres se succèdent mieux avec des transitions très discrètes
      transition = { style: 'blend', duration: 1.2, tempoSync: true, reason: null };
    }

    if (!this.nextTransition && transition) {
      this.nextTransition = transition;
    }

    let fadeDuration = resolveFadeDuration(transition, this.crossfadeSeconds, remaining);
    if (sameAlbum && !this.nextTransition) {
      fadeDuration = Math.min(0.9, fadeDuration);
    } else if (sameAlbum && this.nextTransition?.style !== 'cut') {
      fadeDuration = Math.min(fadeDuration, 1.0);
    }
    if (!sameAlbum && outBpm && inBpm) {
      const diff = Math.abs(outBpm - inBpm);
      if (diff > 16 && transition?.tempoSync === false) {
        fadeDuration = Math.min(fadeDuration, 0.6);
      } else if (diff > 12 && fadeDuration > 4) {
        fadeDuration = Math.min(fadeDuration, 4);
      } else if (diff > 10 && fadeDuration > 3) {
        fadeDuration = Math.min(fadeDuration, 3);
      }
    }
    if (fadeDuration <= 0.05) {
      this.armed = false;
      this.nextTransition = null;
      return;
    }

    // Les estimations de tempo sont lues sans await : si l'analyse n'est pas
    // terminée à l'armement, le plan dégrade proprement (fondu sans beat-sync).
    const outBeat = this.beats.get(outgoing.url) ?? null;
    const inBeat = this.beats.get(this.nextUrl) ?? null;

    const forceCut = transition?.style === 'cut';
    const skipTempoSync = forceCut || transition?.tempoSync === false;
    const plan = planBeatSync({
      position,
      duration,
      crossfade: fadeDuration,
      // Priorité aux BPM fournis par l'API ; l'estimation comble le trou.
      outBpm: skipTempoSync ? 0 : outgoing.track?.bpm ?? outBeat?.bpm ?? 0,
      inBpm: skipTempoSync ? 0 : this.nextTrack.bpm ?? inBeat?.bpm ?? 0,
      outPhase: outBeat?.phase ?? 0,
      inPhase: inBeat?.phase ?? 0,
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

    const fadeStartAbs = ctx.currentTime + plan.fadeStart;
    const fadeEndAbs = fadeStartAbs + fadeDuration;
    this.fadePlan = { startAt: fadeStartAbs, endAt: fadeEndAbs };

    // Démarrage du titre entrant légèrement avant le début du fondu : c'est
    // à cet instant que le sortant prend le tempo du suivant (±8 %).
    const delayMs = Math.max(0, plan.fadeStart - LEAD_IN_SECONDS) * 1000;
    window.setTimeout(() => {
      if (!this.armed) return;
      outgoing.el.playbackRate = plan.outgoingRate;
      outgoing.rate = plan.outgoingRate;
      void this.startIncoming(incoming, plan.inOffset, fadeStartAbs, fadeDuration);
    }, delayMs);
  }

  private async startIncoming(
    deck: Deck,
    offset: number,
    fadeStartAbs: number,
    fadeDuration: number,
  ): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    const el = deck.el;

    // L'entrée joue à sa vitesse naturelle : c'est le sortant qui s'ajuste.
    el.playbackRate = 1;
    deck.rate = 1;
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
      this.nextTransition?.style,
      outgoing.track?.bpm ?? 0,
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

    // Transition IA : pour un cut, on force la coupure immédiate du sortant
    // (pas de fondu progressif). Pour les autres styles, on garde le fondu croisé.
    if (this.nextTransition?.style === 'cut') {
      outgoing.gain.gain.cancelScheduledValues(fadeStartAbs);
      outgoing.gain.gain.setValueAtTime(0, fadeStartAbs);
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
    outgoing.rate = 1;
    outgoing.el.playbackRate = 1;

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
   * Lance (une seule fois par URL) l'estimation de tempo d'un flux ; le
   * résultat est lu à l'armement du fondu, sans bloquer la lecture.
   */
  private startBeatAnalysis(url: string): void {
    if (!url || this.analyzing.has(url) || this.beats.has(url)) return;
    this.analyzing.add(url);
    void this.analyze(url).then((estimate) => {
      this.beats.set(url, estimate);
      this.analyzing.delete(url);
    });
  }

  private async analyze(url: string): Promise<TempoEstimate | null> {
    const ctx = this.ctx;
    if (!ctx) return null;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      // shortcut: decodeAudioData décompresse tout le fichier en PCM flottant
      // (~1,7 Mo/s stéréo) ; pour des médias de plusieurs dizaines de minutes,
      // analyser un segment (en-tête Range) au lieu du fichier entier.
      const audio = await ctx.decodeAudioData(await response.arrayBuffer());
      return estimateTempo(audio.getChannelData(0), audio.sampleRate);
    } catch {
      return null; // flux non récupérable : fondu en puissance constante
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

/** Instance unique partagée par le store et l'UI. */
export const engine = new AudioEngine();
