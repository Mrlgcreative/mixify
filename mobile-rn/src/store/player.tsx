/* eslint-disable react-hooks/immutability -- expo-audio exposes `volume` as a writable native property; there is no setter method. */
import { getBatteryLevelAsync } from 'expo-battery';
import Constants from 'expo-constants';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { NetworkStateType } from 'expo-network';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { getStreamUrl, recordHistory } from '@/api/musicApi';
import { cacheAudio, getCachedAudio } from '@/lib/audioCache';
import { canPrefetch } from '@/lib/cachePolicy';
import { recordAudioHit, recordPlaybackStart } from '@/lib/metrics';
import {
  MAX_CROSSFADE_SECONDS,
  MIN_CROSSFADE_SECONDS,
  fadeSecondsFor,
  fadeVolumes,
  nextIndexFor,
  tempoMatchRate,
} from '@/lib/mix';
import { getNetworkStatus } from '@/lib/network';
import { storage } from '@/lib/storage';
import type { RepeatMode, Track, TransitionMode } from '@/types/music';

interface PlayerContextValue {
  queue: Track[];
  current: Track | null;
  isPlaying: boolean;
  loading: boolean;
  error: string | null;
  shuffle: boolean;
  repeat: RepeatMode;
  transitionStyle: TransitionMode;
  crossfadeSeconds: number;
  /** Vrai pendant un fondu entre deux titres. */
  mixing: boolean;
  playTrack: (track: Track, queue?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setTransitionStyle: (style: TransitionMode) => void;
  setCrossfadeSeconds: (seconds: number) => void;
  addToQueue: (track: Track) => void;
  removeAt: (index: number) => void;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

/** Progression isolée : seuls les composants qui l'affichent se re-rendent au tick. */
interface PlayerProgress {
  position: number;
  duration: number;
}

const PlayerProgressContext = createContext<PlayerProgress | null>(null);

/** Deux platines : l'une joue, l'autre précharge le titre suivant. */
type Deck = 'a' | 'b';

const SETTINGS_KEY = 'mixify.player-settings.v1';

interface StoredSettings {
  transitionStyle: TransitionMode;
  crossfadeSeconds: number;
}

const DEFAULT_SETTINGS: StoredSettings = {
  transitionStyle: 'automix',
  crossfadeSeconds: 8,
};

function readSettings(): StoredSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    const style: TransitionMode =
      parsed.transitionStyle === 'off' ||
      parsed.transitionStyle === 'automix' ||
      parsed.transitionStyle === 'crossfade'
        ? parsed.transitionStyle
        : DEFAULT_SETTINGS.transitionStyle;
    const seconds = Number(parsed.crossfadeSeconds);
    return {
      transitionStyle: style,
      crossfadeSeconds: Number.isFinite(seconds)
        ? Math.min(MAX_CROSSFADE_SECONDS, Math.max(MIN_CROSSFADE_SECONDS, Math.round(seconds)))
        : DEFAULT_SETTINGS.crossfadeSeconds,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: StoredSettings): void {
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* réglage non persistant : la session reste utilisable */
  }
}

/**
 * Expo Go n'embarque pas le service de lecture en arrière-plan : activer les
 * contrôles d'écran verrouillé y échoue et pollue les logs.
 */
const backgroundAudioSupported = Constants.expoGoConfig == null;

/**
 * Téléchargements opportunistes : jamais hors ligne, toujours sur Wi-Fi,
 * sur données mobiles seulement si la batterie tient la route.
 */
async function prefetchAllowed(): Promise<boolean> {
  const { online, type } = getNetworkStatus();
  if (!online) return false;
  if (type === NetworkStateType.WIFI) return true;

  const level = await getBatteryLevelAsync().catch(() => -1);
  return canPrefetch({
    online,
    cellular: true,
    battery: level < 0 ? null : level,
  });
}

/** Met le morceau en cache local sans bloquer la lecture. */
async function cacheInBackground(track: Track, url: string): Promise<void> {
  if (!(await prefetchAllowed())) return;
  await cacheAudio(track.id, url).catch(() => undefined);
}

function lockScreenMetadata(track: Track) {
  return {
    title: track.title,
    artist: track.artist.name,
    albumTitle: track.album?.title,
    artworkUrl: track.coverUrl ?? track.album?.coverUrl,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const playerA = useAudioPlayer(null, { updateInterval: 250 });
  const playerB = useAudioPlayer(null, { updateInterval: 250 });
  const statusA = useAudioPlayerStatus(playerA);
  const statusB = useAudioPlayerStatus(playerB);

  const [settings, setSettings] = useState<StoredSettings>(readSettings);
  const { transitionStyle, crossfadeSeconds } = settings;

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState<Deck>('a');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('off');
  const [mixing, setMixing] = useState(false);

  const activePlayer = active === 'a' ? playerA : playerB;
  const inactivePlayer = active === 'a' ? playerB : playerA;
  const status = active === 'a' ? statusA : statusB;
  const inactiveStatus = active === 'a' ? statusB : statusA;

  const finishHandled = useRef(false);
  const mixingRef = useRef(false);
  const mixRef = useRef<{ incoming: Deck; outgoing: Deck } | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preloadedRef = useRef<{
    trackId: string;
    index: number;
    deck: Deck;
    cached: boolean;
  } | null>(null);
  const loadStartedAt = useRef<number | null>(null);
  const loadStartedFor = useRef<string | null>(null);
  const loadToken = useRef(0);

  const current = queue[index] ?? null;

  const setTransitionStyle = useCallback((style: TransitionMode) => {
    setSettings((stored) => {
      const next = { ...stored, transitionStyle: style };
      saveSettings(next);
      return next;
    });
  }, []);

  const setCrossfadeSeconds = useCallback((seconds: number) => {
    const value = Math.min(
      MAX_CROSSFADE_SECONDS,
      Math.max(MIN_CROSSFADE_SECONDS, Math.round(seconds)),
    );
    setSettings((stored) => {
      const next = { ...stored, crossfadeSeconds: value };
      saveSettings(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!backgroundAudioSupported) return;
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  /** Coupe un fondu en cours sans toucher à la lecture du titre sortant. */
  const stopMix = useCallback(() => {
    if (fadeTimer.current != null) {
      clearInterval(fadeTimer.current);
      fadeTimer.current = null;
    }
    const mix = mixRef.current;
    if (mix) {
      const incoming = mix.incoming === 'a' ? playerA : playerB;
      const outgoing = mix.outgoing === 'a' ? playerA : playerB;
      incoming.pause();
      incoming.volume = 0;
      outgoing.volume = 1;
      outgoing.setPlaybackRate(1);
      mixRef.current = null;
    }
    mixingRef.current = false;
    setMixing(false);
  }, [playerA, playerB]);

  const load = useCallback(
    async (track: Track) => {
      stopMix();
      preloadedRef.current = null;
      const token = ++loadToken.current;
      setError(null);
      setLoading(true);
      loadStartedAt.current = Date.now();
      loadStartedFor.current = track.id;
      try {
        // Un morceau déjà écouté démarre depuis le disque, sans réseau.
        const cached = getCachedAudio(track.id);
        let uri: string;
        if (cached) {
          recordAudioHit();
          uri = cached;
        } else {
          uri = await getStreamUrl(track);
          if (token !== loadToken.current) return;
          void cacheInBackground(track, uri);
        }
        if (token !== loadToken.current) return;

        inactivePlayer.pause();
        inactivePlayer.volume = 0;
        inactivePlayer.setPlaybackRate(1);
        activePlayer.volume = 1;
        activePlayer.setPlaybackRate(1);
        activePlayer.replace({ uri });
        if (backgroundAudioSupported) {
          activePlayer.setActiveForLockScreen(true, lockScreenMetadata(track));
        }
        activePlayer.play();
        finishHandled.current = false;
        void recordHistory(track);
      } catch (cause) {
        if (token === loadToken.current) {
          setError(cause instanceof Error ? cause.message : 'Lecture impossible');
        }
      } finally {
        if (token === loadToken.current) setLoading(false);
      }
    },
    [activePlayer, inactivePlayer, stopMix],
  );

  // Démarrage mesuré jusqu'au premier statut « chargé » du lecteur.
  useEffect(() => {
    if (!status.isLoaded || !current || loadStartedAt.current == null) return;
    if (loadStartedFor.current !== current.id) return;
    recordPlaybackStart(Date.now() - loadStartedAt.current);
    loadStartedAt.current = null;
  }, [current, status.isLoaded]);

  // Précharge les deux titres suivants de la file, selon réseau et batterie.
  useEffect(() => {
    if (!current || queue.length < 2) return;
    const upcoming: Track[] = [];
    for (let offset = 1; offset <= 2 && offset < queue.length; offset += 1) {
      const track = queue[(index + offset) % queue.length];
      if (track && track.id !== current.id) upcoming.push(track);
    }
    if (upcoming.length === 0) return;

    void (async () => {
      for (const track of upcoming) {
        if (!(await prefetchAllowed())) return;
        try {
          const url = await getStreamUrl(track);
          await cacheAudio(track.id, url);
        } catch {
          /* préchargement opportuniste : la lecture réseau reste possible */
        }
      }
    })();
  }, [current, index, queue]);

  /** Titre suivant de la file, stable pendant toute la durée du morceau. */
  const upcomingIndex = useMemo(() => {
    // File d'un seul titre : pas de fondu vers soi-même, on repart du début.
    if (transitionStyle === 'off' || repeat === 'one' || queue.length < 2) return null;
    return nextIndexFor({ index, length: queue.length, shuffle, repeat });
  }, [transitionStyle, repeat, queue.length, index, shuffle]);

  // Charge le titre suivant dans la platine libre, sans interrompre la lecture.
  useEffect(() => {
    if (mixingRef.current) return;
    preloadedRef.current = null;
    if (upcomingIndex == null) return;
    const track = queue[upcomingIndex];
    if (!track) return;

    const deck: Deck = active === 'a' ? 'b' : 'a';
    const player = deck === 'a' ? playerA : playerB;
    let cancelled = false;

    void (async () => {
      try {
        const cached = getCachedAudio(track.id);
        let uri = cached;
        if (!uri) {
          if (!(await prefetchAllowed())) return;
          uri = await getStreamUrl(track);
        }
        if (cancelled) return;
        player.volume = 0;
        player.setPlaybackRate(1);
        player.replace({ uri });
        preloadedRef.current = { trackId: track.id, index: upcomingIndex, deck, cached: Boolean(cached) };
      } catch {
        /* pas de préchargement : enchaînement classique en fin de piste */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, playerA, playerB, queue, upcomingIndex]);

  const startMix = useCallback(
    (outgoingTrack: Track, nextTrack: Track, targetIndex: number, targetDeck: Deck, fade: number, fromCache: boolean) => {
      if (mixingRef.current || fade <= 0) return;
      const outgoingDeck: Deck = targetDeck === 'a' ? 'b' : 'a';
      const outgoing = outgoingDeck === 'a' ? playerA : playerB;
      const incoming = targetDeck === 'a' ? playerA : playerB;

      mixingRef.current = true;
      mixRef.current = { incoming: targetDeck, outgoing: outgoingDeck };
      setMixing(true);

      if (transitionStyle === 'automix') {
        const rate = tempoMatchRate(outgoingTrack.bpm, nextTrack.bpm);
        if (Math.abs(rate - 1) > 0.001) outgoing.setPlaybackRate(rate, 'medium');
      }
      incoming.volume = 0;

      void incoming
        .seekTo(0)
        .then(() => {
          if (!mixingRef.current || mixRef.current?.incoming !== targetDeck) return;
          incoming.play();
          const startedAt = Date.now();

          fadeTimer.current = setInterval(() => {
            if (mixRef.current?.incoming !== targetDeck) {
              if (fadeTimer.current != null) clearInterval(fadeTimer.current);
              fadeTimer.current = null;
              return;
            }

            const progress = Math.min(1, (Date.now() - startedAt) / (fade * 1000));
            const volumes = fadeVolumes(progress);
            outgoing.volume = volumes.out;
            incoming.volume = volumes.in;

            if (progress < 1) return;

            if (fadeTimer.current != null) clearInterval(fadeTimer.current);
            fadeTimer.current = null;
            outgoing.pause();
            outgoing.volume = 1;
            outgoing.setPlaybackRate(1);
            incoming.volume = 1;
            mixingRef.current = false;
            mixRef.current = null;
            // La fin du titre sortant ne doit pas déclencher un second saut.
            finishHandled.current = true;
            setMixing(false);
            preloadedRef.current = null;
            if (fromCache) recordAudioHit();

            if (backgroundAudioSupported) {
              outgoing.setActiveForLockScreen(false);
              incoming.setActiveForLockScreen(true, lockScreenMetadata(nextTrack));
            }
            setActive(targetDeck);
            setIndex(targetIndex);
            void recordHistory(nextTrack);
          }, 50);
        })
        .catch(() => {
          if (mixRef.current?.incoming !== targetDeck) return;
          mixRef.current = null;
          mixingRef.current = false;
          setMixing(false);
          outgoing.volume = 1;
          outgoing.setPlaybackRate(1);
          incoming.pause();
          incoming.volume = 0;
        });
    },
    [playerA, playerB, transitionStyle],
  );

  // Lance le fondu quand il reste juste assez de piste devant.
  useEffect(() => {
    if (transitionStyle === 'off' || mixingRef.current || repeat === 'one') return;
    const preloaded = preloadedRef.current;
    if (!current || upcomingIndex == null || !preloaded) return;
    if (preloaded.index !== upcomingIndex || !inactiveStatus.isLoaded) return;
    const nextTrack = queue[preloaded.index];
    if (!nextTrack || nextTrack.id !== preloaded.trackId) return;
    if (!status.playing || status.duration <= 0 || status.currentTime <= 0.5) return;

    const remaining = status.duration - status.currentTime;
    const fade = Math.min(
      fadeSecondsFor(transitionStyle, crossfadeSeconds, status.duration),
      Math.max(0.2, remaining),
    );
    if (fade <= 0 || remaining > fadeSecondsFor(transitionStyle, crossfadeSeconds, status.duration)) {
      return;
    }

    // La fin de piste est un évènement externe : on sort du corps de l'effet
    // avant de changer d'état, pour ne pas déclencher de rendu en cascade.
    const frame = requestAnimationFrame(() =>
      startMix(current, nextTrack, preloaded.index, preloaded.deck, fade, preloaded.cached),
    );
    return () => cancelAnimationFrame(frame);
  }, [
    current,
    crossfadeSeconds,
    inactiveStatus.isLoaded,
    queue,
    repeat,
    startMix,
    status.currentTime,
    status.duration,
    status.playing,
    transitionStyle,
    upcomingIndex,
  ]);

  const playTrack = useCallback(
    (track: Track, list?: Track[]) => {
      const nextQueue = list && list.length > 0 ? list : [track];
      const start = Math.max(0, nextQueue.findIndex((item) => item.id === track.id));
      const resume = current?.id === track.id;
      stopMix();
      setQueue(nextQueue);
      setIndex(start);
      if (resume && activePlayer.isLoaded) {
        activePlayer.play();
        return;
      }
      void load(track);
    },
    [activePlayer, current?.id, load, stopMix],
  );

  const toggle = useCallback(() => {
    if (!current) return;
    stopMix();
    if (status.playing) {
      activePlayer.pause();
      return;
    }
    if (!activePlayer.isLoaded) {
      void load(current);
      return;
    }
    // En fin de piste, une lecture normale repart du début.
    const ended =
      status.didJustFinish ||
      (status.duration > 0 && status.currentTime >= status.duration - 0.25);
    if (ended) {
      void activePlayer
        .seekTo(0)
        .then(() => activePlayer.play())
        .catch(() => activePlayer.play());
      return;
    }
    activePlayer.play();
  }, [
    activePlayer,
    current,
    load,
    status.currentTime,
    status.didJustFinish,
    status.duration,
    status.playing,
    stopMix,
  ]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    const target = nextIndexFor({ index, length: queue.length, shuffle, repeat });
    stopMix();
    if (target == null) {
      activePlayer.pause();
      return;
    }
    // Même titre (repeat all sur une file d'un seul titre) : repartir du début.
    if (target === index) {
      void activePlayer
        .seekTo(0)
        .then(() => activePlayer.play())
        .catch(() => activePlayer.play());
      return;
    }
    setIndex(target);
    void load(queue[target]);
  }, [activePlayer, index, load, queue, repeat, shuffle, stopMix]);

  const previous = useCallback(() => {
    if (!current) return;
    stopMix();
    if (status.currentTime > 3) {
      void activePlayer.seekTo(0);
      return;
    }
    if (queue.length === 0) return;
    if (index === 0 && repeat === 'off' && !shuffle) {
      void activePlayer.seekTo(0);
      return;
    }
    const target = (index - 1 + queue.length) % queue.length;
    // Même titre : repartir du début sans recharger le flux.
    if (target === index) {
      void activePlayer.seekTo(0);
      return;
    }
    setIndex(target);
    void load(queue[target]);
  }, [
    activePlayer,
    current,
    index,
    load,
    queue,
    repeat,
    shuffle,
    status.currentTime,
    stopMix,
  ]);

  const seek = useCallback(
    (seconds: number) => {
      stopMix();
      void activePlayer.seekTo(Math.max(0, seconds));
    },
    [activePlayer, stopMix],
  );

  const toggleShuffle = useCallback(() => {
    stopMix();
    setShuffle((value) => !value);
  }, [stopMix]);

  const cycleRepeat = useCallback(() => {
    stopMix();
    setRepeat((value) => (value === 'off' ? 'all' : value === 'all' ? 'one' : 'off'));
  }, [stopMix]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((currentQueue) =>
      currentQueue.some((item) => item.id === track.id)
        ? currentQueue
        : [...currentQueue, track],
    );
  }, []);

  const removeAt = useCallback(
    (target: number) => {
      stopMix();
      setQueue((currentQueue) => currentQueue.filter((_, position) => position !== target));
      setIndex((value) => (target < value ? value - 1 : value));
    },
    [stopMix],
  );

  useEffect(() => {
    if (!status.didJustFinish) {
      finishHandled.current = false;
      return;
    }
    if (mixing) return;
    if (!current || finishHandled.current) return;
    finishHandled.current = true;
    // La fin de piste est un évènement externe : on sort du corps de l'effet
    // avant de changer d'état, pour ne pas déclencher de rendu en cascade.
    const frame = requestAnimationFrame(() => {
      // La répétition d'un titre ne vaut que pour l'enchaînement automatique :
      // le bouton « suivant » avance toujours.
      if (repeat === 'one') {
        void activePlayer
          .seekTo(0)
          .then(() => activePlayer.play())
          .catch(() => activePlayer.play());
        return;
      }
      next();
    });
    return () => cancelAnimationFrame(frame);
  }, [activePlayer, current, mixing, next, repeat, status.didJustFinish]);

  const value = useMemo(
    () => ({
      queue,
      current,
      isPlaying: status.playing,
      loading,
      error,
      shuffle,
      repeat,
      transitionStyle,
      crossfadeSeconds,
      mixing,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      toggleShuffle,
      cycleRepeat,
      setTransitionStyle,
      setCrossfadeSeconds,
      addToQueue,
      removeAt,
    }),
    [
      queue,
      current,
      status.playing,
      loading,
      error,
      shuffle,
      repeat,
      transitionStyle,
      crossfadeSeconds,
      mixing,
      playTrack,
      toggle,
      next,
      previous,
      seek,
      toggleShuffle,
      cycleRepeat,
      setTransitionStyle,
      setCrossfadeSeconds,
      addToQueue,
      removeAt,
    ],
  );

  const progress = useMemo(
    () => ({
      position: status.currentTime || 0,
      duration: status.duration || current?.duration || 0,
    }),
    [status.currentTime, status.duration, current?.duration],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerProgressContext.Provider value={progress}>{children}</PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer doit être utilisé dans PlayerProvider');
  return context;
}

export function usePlayerProgress(): PlayerProgress {
  const context = useContext(PlayerProgressContext);
  if (!context) throw new Error('usePlayerProgress doit être utilisé dans PlayerProvider');
  return context;
}
