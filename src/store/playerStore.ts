import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@capgo/capacitor-media-session';

import { api } from '../api/musicApi';
import { engine } from '../audio/engine';
import { offlineUrl } from '../audio/offline';
import { MAX_CROSSFADE_SECONDS, MIN_CROSSFADE_SECONDS } from '../audio/crossfade';
import type { MixPlan, PlayerState, RepeatMode, Track, TransitionMode } from '../types/music';

const mediaSession = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
/** Service Android de lecture en arrière-plan (notification + session média). */
const isNative = Capacitor.isNativePlatform();
let wakeLock: WakeLockSentinel | null = null;

function setMediaMetadata(track: Track | null): void {
  const artwork = track ? (track.album?.coverUrl ?? track.coverUrl) : undefined;
  if (isNative) {
    void MediaSession.setMetadata({
      title: track?.title ?? '',
      artist: track?.artist?.name ?? '',
      album: track?.album?.title ?? '',
      // shortcut: pas de pochette native, le plugin la télécharge sur le
      // thread principal (NetworkOnMainThreadException) ; passer une data URL
      // si la pochette devient nécessaire dans la notification.
      artwork: [],
    }).catch(() => {
      /* notification indisponible : la lecture continue */
    });
  }
  if (!mediaSession) return;
  if (!track) {
    mediaSession.metadata = null;
    return;
  }
  try {
    mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist?.name || undefined,
      album: track.album?.title || undefined,
      artwork: artwork
        ? [{ src: artwork, sizes: '512x512', type: 'image/png' }]
        : undefined,
    });
  } catch {
    /* API non supportée */
  }
}

function setMediaPlaybackState(state: 'playing' | 'paused' | 'none'): void {
  if (isNative) {
    void MediaSession.setPlaybackState({ playbackState: state }).catch(() => {
      /* service arrêté : la lecture continue */
    });
  }
  if (!mediaSession) return;
  try {
    mediaSession.playbackState = state;
  } catch {
    /* ignore */
  }
}

async function requestWakeLock(): Promise<void> {
  if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
  try {
    wakeLock?.release();
    wakeLock = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      wakeLock = null;
    });
  } catch {
    /* refusé ou non supporté */
  }
}

async function releaseWakeLock(): Promise<void> {
  try {
    await wakeLock?.release();
  } catch {
    /* ignore */
  }
  wakeLock = null;
}

/**
 * Store global du lecteur.
 *
 * Le store ne manipulate jamais le DOM audio : il pilote `engine` (Web Audio)
 * et conserve l'état UI (file d'attente, modes, volume, progression).
 * L'Auto-Mix n'est qu'un mode de transition (`off` / `automix` / `crossfade`,
 * plus la durée fixe du crossfade) transmis au moteur.
 */

interface PlayerStore extends PlayerState {
  currentTrack: Track | null;
  /** Panneau latéral (file d'attente) ouvert. */
  queueOpen: boolean;
  /** Message d'erreur éphémère. */
  notice: string | null;
  /** Index du titre qui sera joué à la fin du titre courant. */
  pendingIndex: number | null;

  /** Plan de mix IA (ordre + transitions) pour la file courante. */
  mixPlan: MixPlan | null;
  mixPlanKey: string | null;
  mixPlanPending: boolean;

  playTrack: (track: Track | undefined, context?: Track[]) => Promise<void>;
  toggle: () => Promise<void>;
  next: (userInitiated?: boolean) => Promise<void>;
  previous: () => Promise<void>;
  seek: (seconds: number) => void;
  setVolume: (value: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setTransitionStyle: (style: TransitionMode) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  toggleQueue: () => void;
  reorderQueue: (from: number, to: number) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  addToQueue: (track: Track) => void;
  clearNotice: () => void;
}

const SETTINGS_KEY = 'mixify.settings';

interface PersistedSettings {
  volume: number;
  transitionStyle: TransitionMode;
  crossfadeSeconds: number;
}

const TRANSITION_MODES: TransitionMode[] = ['off', 'automix', 'crossfade'];

function loadSettings(): PersistedSettings {
  const fallback: PersistedSettings = { volume: 0.8, transitionStyle: 'automix', crossfadeSeconds: 8 };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    // `autoMix` (booléen) vient des anciens réglages : on le migre.
    const stored = JSON.parse(raw) as Partial<PersistedSettings> & { autoMix?: boolean };
    const transitionStyle = TRANSITION_MODES.includes(stored.transitionStyle as TransitionMode)
      ? (stored.transitionStyle as TransitionMode)
      : typeof stored.autoMix === 'boolean'
        ? stored.autoMix
          ? 'automix'
          : 'off'
        : fallback.transitionStyle;
    return {
      volume: typeof stored.volume === 'number' ? stored.volume : fallback.volume,
      transitionStyle,
      crossfadeSeconds:
        typeof stored.crossfadeSeconds === 'number'
          ? Math.max(
              MIN_CROSSFADE_SECONDS,
              Math.min(MAX_CROSSFADE_SECONDS, stored.crossfadeSeconds),
            )
          : fallback.crossfadeSeconds,
    };
  } catch {
    return fallback;
  }
}

function saveSettings(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible (mode privé) : on ignore */
  }
}

/** Persiste les réglages courants du store (volume + transition). */
function persistSettings(get: () => PlayerStore): void {
  const { volume, transitionStyle, crossfadeSeconds } = get();
  saveSettings({ volume, transitionStyle, crossfadeSeconds });
}

/** Choisit le prochain titre en fonction du mode aléatoire et de la répétition. */
function pickNextIndex(
  queue: Track[],
  index: number,
  shuffle: boolean,
  repeat: RepeatMode,
): number | null {
  if (queue.length === 0) return null;
  if (shuffle && queue.length > 1) {
    const candidates = queue.map((_, i) => i).filter((i) => i !== index);
    return candidates[Math.floor(Math.random() * candidates.length)];
  }
  if (index + 1 < queue.length) return index + 1;
  if (repeat === 'all') return 0;
  return null;
}

function mixPlanKey(queue: Track[]): string | null {
  if (queue.length < 2) return null;
  return queue.map((track) => track.id).join(',');
}

async function fetchMixPlan(queue: Track[], set: any, get: any): Promise<void> {
  const key = mixPlanKey(queue);
  if (!key || get().mixPlanKey === key || get().mixPlanPending) return;

  set({ mixPlanPending: true });
  try {
    const plan = await api.getMixPlan(queue.map((track) => track.id));
    const current = mixPlanKey(get().queue);
    if (current === key) {
      set({ mixPlan: plan, mixPlanKey: key });
      // Le plan arrive après le préchargement : on applique son style au prochain fondu.
      const { queue, currentIndex, pendingIndex } = get();
      const outgoing = queue[currentIndex];
      const incoming = pendingIndex === null ? null : queue[pendingIndex];
      engine.applyTransition(
        outgoing && incoming
          ? plan.transitions[`${outgoing.id}->${incoming.id}`] ?? null
          : null,
      );
    }
  } catch {
    // L'IA n'est pas dispo : on garde le mix local, sans blocage.
    const current = mixPlanKey(get().queue);
    if (current === key) {
      set({ mixPlanKey: key });
    }
  } finally {
    set({ mixPlanPending: false });
  }
}

const initialSettings = loadSettings();

/** Flux local si le titre est téléchargé, sinon URL réseau. */
async function resolveStreamUrl(track: Track): Promise<string> {
  return (await offlineUrl(track.id)) ?? api.getStreamUrl(track);
}

export const usePlayer = create<PlayerStore>((set, get) => {
  /** Charge un titre et (re)prépare le suivant pour l'Auto-Mix. */
  const prepareNext = async (): Promise<void> => {
    const { queue, currentIndex, shuffle, repeat, mixPlan } = get();
    if (queue.length === 0) {
      await engine.setNext(null, '');
      return;
    }
    const nextIndex = pickNextIndex(queue, currentIndex, shuffle, repeat);
    if (nextIndex === null) {
      await engine.setNext(null, '');
      set({ pendingIndex: null });
      return;
    }
    const nextTrack = queue[nextIndex];
    const currentTrack = queue[currentIndex];
    const transition =
      currentTrack && mixPlan?.transitions[`${currentTrack.id}->${nextTrack.id}`]
        ? mixPlan.transitions[`${currentTrack.id}->${nextTrack.id}`]
        : null;
    set({ pendingIndex: nextIndex });
    try {
      const url = await resolveStreamUrl(nextTrack);
      await engine.setNext(nextTrack, url, transition);
    } catch {
      await engine.setNext(null, '');
      set({ pendingIndex: null });
    }
  };

  // Liaison moteur -> store.
  engine.attach({
    onTime: (position, duration) => {
      const state = get();
      if (!state.currentTrack) return;
      set({ position, duration: duration || state.duration });
    },
    onEnded: () => {
      void get().next();
    },
    onSwapped: () => {
      // Le fondu s'est terminé : le deck entrant devient le titre courant.
      const { queue, pendingIndex } = get();
      if (pendingIndex === null || !queue[pendingIndex]) return;
      const nextTrack = queue[pendingIndex];
      set({
        currentIndex: pendingIndex,
        currentTrack: nextTrack,
        isPlaying: true,
        position: 0,
        duration: nextTrack.duration,
      });
      setMediaMetadata(nextTrack);
      setMediaPlaybackState('playing');
      void api.recordHistory(nextTrack);
      void prepareNext();
    },
    onError: (message) => set({ notice: message }),
    onMixStart: () => set({ mixing: true }),
    onMixEnd: () => set({ mixing: false }),
  });

  // Service média natif : garde l'app vivante en arrière-plan et pilote la
  // lecture depuis la notification / l'écran verrouillé.
  if (isNative) {
    const bind = (
      action: 'play' | 'pause' | 'nexttrack' | 'previoustrack',
      run: () => void,
    ) => {
      void MediaSession.setActionHandler({ action }, run).catch(() => {
        /* action non supportée */
      });
    };
    bind('play', () => {
      if (!get().isPlaying) void get().toggle();
    });
    bind('pause', () => {
      if (get().isPlaying) void get().toggle();
    });
    bind('nexttrack', () => {
      void get().next();
    });
    bind('previoustrack', () => {
      void get().previous();
    });
    void MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
      if (typeof details.seekTime === 'number') get().seek(details.seekTime);
    }).catch(() => {
      /* seek non supporté */
    });
  }

  if (mediaSession) {
    try {
      mediaSession.setActionHandler('play', () => {
        void get().toggle();
      });
      mediaSession.setActionHandler('pause', () => {
        void get().toggle();
      });
      mediaSession.setActionHandler('previoustrack', () => {
        void get().previous();
      });
      mediaSession.setActionHandler('nexttrack', () => {
        void get().next();
      });
      mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
          get().seek(details.seekTime);
        }
      });
    } catch {
      /* handlers non supportés */
    }
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const { isPlaying } = get();
        if (isPlaying) void requestWakeLock();
      }
    });
  }

  engine.setVolume(initialSettings.volume);
  engine.setTransition(initialSettings.transitionStyle, initialSettings.crossfadeSeconds);

  return {
    queue: [],
    currentIndex: -1,
    currentTrack: null,
    isPlaying: false,
    shuffle: false,
    repeat: 'off',
    volume: initialSettings.volume,
    muted: false,
    position: 0,
    duration: 0,
    transitionStyle: initialSettings.transitionStyle,
    crossfadeSeconds: initialSettings.crossfadeSeconds,
    mixing: false,
    queueOpen: false,
    notice: null,
    pendingIndex: null,
    mixPlan: null,
    mixPlanKey: null,
    mixPlanPending: false,

  async playTrack(track, context) {
    // `playlist.tracks[0]` ou `liked[0]` peut être vide selon l'API : sans
    // ce garde-fou, la lecture d'une liste vide plante sur track.duration.
    if (!track) return;
    const state = get();
    let queue = state.queue;
    let index = state.queue.findIndex((t) => t.id === track.id);

    if (context && context.length > 0) {
      // Un même titre peut apparaître dans plusieurs rayons (accueil) : la
      // file est indexée par id, on retire les doublons en gardant l'ordre.
      queue = [...new Map(context.map((t) => [t.id, t])).values()];
      index = queue.findIndex((t) => t.id === track.id);
    } else if (index === -1) {
      queue = [...state.queue, track];
      index = queue.length - 1;
    }

    set({ queue, currentIndex: index, currentTrack: track });
    await engine.play(track, await resolveStreamUrl(track), 0);
    set({ isPlaying: true, position: 0, duration: track.duration });
    setMediaMetadata(track);
    setMediaPlaybackState('playing');
    void requestWakeLock();
    void api.recordHistory(track);
    set({ mixPlan: null, mixPlanKey: null });
    void fetchMixPlan(queue, set, get);
    void prepareNext();
  },

    async toggle() {
      const { isPlaying, currentTrack } = get();
      if (!currentTrack) return;
      if (isPlaying) {
        engine.pause();
        set({ isPlaying: false });
        setMediaPlaybackState('paused');
        void releaseWakeLock();
      } else {
        await engine.resume();
        set({ isPlaying: true });
        setMediaPlaybackState('playing');
        void requestWakeLock();
      }
    },

    async next() {
      const { queue, currentIndex, shuffle, repeat, currentTrack } = get();
      if (!currentTrack) return;

      if (repeat === 'one' && !shuffle) {
        engine.seek(0);
        await engine.resume();
        set({ position: 0, isPlaying: true });
        setMediaPlaybackState('playing');
        void requestWakeLock();
        return;
      }

      const nextIndex = pickNextIndex(queue, currentIndex, shuffle, repeat);
      if (nextIndex === null) {
        engine.pause();
        set({ isPlaying: false, position: 0 });
        setMediaPlaybackState('paused');
        void releaseWakeLock();
        return;
      }
      const track = queue[nextIndex];
      set({ currentIndex: nextIndex, currentTrack: track });
      await engine.play(track, await resolveStreamUrl(track), 0);
      set({ isPlaying: true, position: 0, duration: track.duration });
      setMediaMetadata(track);
      setMediaPlaybackState('playing');
      void requestWakeLock();
      void api.recordHistory(track);
      void prepareNext();
    },

    async previous() {
      const { queue, currentIndex, currentTrack, position } = get();
      if (!currentTrack) return;
      if (position > 3) {
        engine.seek(0);
        set({ position: 0 });
        return;
      }
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
      const track = queue[previousIndex];
      if (!track) return;
      set({ currentIndex: previousIndex, currentTrack: track });
      await engine.play(track, await resolveStreamUrl(track), 0);
      set({ isPlaying: true, position: 0, duration: track.duration });
      setMediaMetadata(track);
      setMediaPlaybackState('playing');
      void requestWakeLock();
      void api.recordHistory(track);
      void prepareNext();
    },

    seek(seconds) {
      engine.seek(seconds);
      set({ position: seconds });
    },

    setVolume(value) {
      const volume = Math.max(0, Math.min(1, value));
      engine.setVolume(volume);
      set({ volume, muted: volume === 0 });
      persistSettings(get);
    },

    toggleMute() {
      const muted = !get().muted;
      engine.setMuted(muted);
      set({ muted });
    },

    toggleShuffle() {
      set({ shuffle: !get().shuffle });
      void prepareNext();
    },

    cycleRepeat() {
      const order: RepeatMode[] = ['off', 'all', 'one'];
      const repeat = order[(order.indexOf(get().repeat) + 1) % order.length];
      set({ repeat });
      void prepareNext();
    },

    setTransitionStyle(style) {
      const { crossfadeSeconds } = get();
      engine.setTransition(style, crossfadeSeconds);
      set({ transitionStyle: style });
      persistSettings(get);
    },

    setCrossfadeSeconds(seconds) {
      const value = Math.max(MIN_CROSSFADE_SECONDS, Math.min(MAX_CROSSFADE_SECONDS, seconds));
      const { transitionStyle } = get();
      engine.setTransition(transitionStyle, value);
      set({ crossfadeSeconds: value });
      persistSettings(get);
    },

    toggleQueue() {
      set({ queueOpen: !get().queueOpen });
    },

    reorderQueue(from, to) {
      const { queue, currentIndex } = get();
      if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
      const next = [...queue];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      let index = currentIndex;
      if (from < currentIndex && to >= currentIndex) index -= 1;
      else if (from > currentIndex && to <= currentIndex) index += 1;

      set({ queue: next, currentIndex: index, mixPlan: null, mixPlanKey: null });
      void fetchMixPlan(next, set, get);
      void prepareNext();
    },

    removeFromQueue(index) {
      const { queue, currentIndex } = get();
      if (index === currentIndex) return; // on ne retire pas le titre en cours
      const next = queue.filter((_, i) => i !== index);
      set({
        queue: next,
        currentIndex: index < currentIndex ? currentIndex - 1 : currentIndex,
        mixPlan: null,
        mixPlanKey: null,
      });
      void fetchMixPlan(next, set, get);
      void prepareNext();
    },

    /** Vide la file en gardant le titre en cours. */
    clearQueue() {
      const { queue, currentTrack } = get();
      const remaining = currentTrack ? queue.filter((t) => t.id === currentTrack.id) : [];
      set({ queue: remaining, currentIndex: remaining.length > 0 ? 0 : -1, mixPlan: null, mixPlanKey: null });
      void prepareNext();
      if (!currentTrack) {
        setMediaMetadata(null);
        setMediaPlaybackState('none');
        void releaseWakeLock();
      }
    },

    addToQueue(track) {
      const { queue } = get();
      if (queue.some((t) => t.id === track.id)) return;
      const next = [...queue, track];
      set({ queue: next, mixPlan: null, mixPlanKey: null });
      void fetchMixPlan(next, set, get);
      void prepareNext();
    },

    clearNotice() {
      set({ notice: null });
    },
  };
});
