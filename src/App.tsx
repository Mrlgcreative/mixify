import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { AuthScreen } from './components/Auth/AuthScreen';
import { Onboarding } from './components/Onboarding/Onboarding';
import { Header } from './components/Header/Header';
import { MobileNav } from './components/MobileNav/MobileNav';
import { Player } from './components/Player/Player';
import { QueuePanel } from './components/Queue/QueuePanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Home } from './views/Home';
import { Admin } from './views/Admin';
import { ArtistStudio } from './views/ArtistStudio';
import { LibraryView, PlaylistDetail } from './views/Library';
import { Profile } from './views/Profile';
import { SearchView } from './views/Search';
import { ChartsView } from './views/Charts';
import { AlbumDetail } from './views/AlbumDetail';
import { ArtistDetail } from './views/ArtistDetail';
import { useAuthStore } from './store/authStore';
import { useFollows } from './store/followsStore';
import { useLibraryStore } from './store/libraryStore';
import { usePlayer } from './store/playerStore';
import { applyTheme, getAccent, theme } from './theme/theme';
import type { ViewName } from './types/music';

interface Navigation {
  stack: ViewName[];
  cursor: number;
}

/** Identifiant de playlist depuis une URL `/playlist/<id>`. */
function playlistIdFromPath(): string | null {
  const match = window.location.pathname.match(/^\/playlist\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function App() {
  const [nav, setNav] = useState<Navigation>({ stack: ['home'], cursor: 0 });
  const [query, setQuery] = useState('');
  const [playlistRoute, setPlaylistRoute] = useState<string | null>(() => playlistIdFromPath());
  const [albumRoute, setAlbumRoute] = useState<string | null>(null);
  const [artistRoute, setArtistRoute] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem('mixify.onboarded') === '1';
    } catch {
      return true; // stockage indisponible : on ne bloque pas l'accès aux pages de compte
    }
  });
  const queueOpen = usePlayer((s) => s.queueOpen);
  const hasTrack = usePlayer((s) => Boolean(s.currentTrack));
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const initAuth = useAuthStore((s) => s.init);
  const loadFavorites = useLibraryStore((s) => s.loadFavorites);
  const loadFollows = useFollows((s) => s.load);
  const resetFollows = useFollows((s) => s.reset);

  // Applique le thème (accent persistant) au montage.
  useEffect(() => {
    applyTheme({ ...theme, colors: { ...theme.colors, primary: getAccent() } });
  }, []);

  // Reprend la session enregistrée (token localStorage -> /api/auth/me).
  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Charge les favoris et abonnements du compte.
  useEffect(() => {
    if (user) {
      void loadFavorites();
      void loadFollows();
    } else {
      resetFollows();
    }
  }, [user, loadFavorites, loadFollows, resetFollows]);

  // Après une connexion, la prochaine déconnexion repart de l'écran de connexion.
  useEffect(() => {
    if (user) setAuthMode('login');
  }, [user]);

  // Les boutons précédent/suivant du navigateur suivent l'URL des playlists.
  useEffect(() => {
    const sync = () => setPlaylistRoute(playlistIdFromPath());
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const finishOnboarding = (next: 'login' | 'register') => {
    try {
      localStorage.setItem('mixify.onboarded', '1');
    } catch {
      /* stockage indisponible : l'onboarding reviendra au prochain chargement */
    }
    setAuthMode(next);
    setOnboarded(true);
  };

  if (!onboarded) return <Onboarding onFinish={finishOnboarding} />;

  if (!authReady) {
    return (
      <div className="bg-grid flex h-full items-center justify-center gap-3 bg-bg text-muted">
        <Loader2 size={18} className="animate-spin" /> Chargement…
      </div>
    );
  }

  if (!user) return <AuthScreen key={authMode} initialMode={authMode} />;

  const view = nav.stack[nav.cursor];

  const navigate = (next: ViewName) => {
    if (playlistRoute) window.history.pushState({}, '', '/');
    setPlaylistRoute(null);
    setAlbumRoute(null);
    setArtistRoute(null);
    setNav((current) => {
      const stack = current.stack.slice(0, current.cursor + 1);
      stack.push(next);
      return { stack, cursor: stack.length - 1 };
    });
  };

  /** Met à jour la recherche et ouvre la page de résultats au besoin. */
  const changeQuery = (value: string) => {
    setQuery(value);
    if (value.trim() && (playlistRoute || view !== 'search')) navigate('search');
  };

  /** Ouvre la page dédiée `/playlist/<id>`. */
  const openPlaylist = (id: string) => {
    setPlaylistRoute(id);
    window.history.pushState({}, '', `/playlist/${encodeURIComponent(id)}`);
  };

  /** Quitte la page playlist pour la bibliothèque. */
  const closePlaylist = () => {
    setPlaylistRoute(null);
    window.history.pushState({}, '', '/library');
    setNav((current) => {
      const stack = current.stack.slice(0, current.cursor + 1);
      if (stack[stack.length - 1] !== 'library') stack.push('library');
      return { stack, cursor: stack.length - 1 };
    });
  };

  const openAlbum = (id: string) => {
    setPlaylistRoute(null);
    setArtistRoute(null);
    setAlbumRoute(id);
  };

  const closeAlbum = () => {
    setAlbumRoute(null);
  };

  const openArtist = (id: string) => {
    setPlaylistRoute(null);
    setAlbumRoute(null);
    setArtistRoute(id);
  };

  const closeArtist = () => {
    setArtistRoute(null);
  };

  return (
    // La clé remonte les vues après connexion/déconnexion : les données
    // dépendant du compte (bibliothèque, playlists) sont rechargées.
    <div key={user?.id ?? 'invite'} className="bg-grid flex h-full flex-col overflow-hidden bg-bg text-text">
      <div className="flex min-h-0 flex-1 gap-0 overflow-hidden p-0 md:gap-2 md:p-2">
        <Sidebar
          view={playlistRoute ? 'library' : view}
          onNavigate={navigate}
          onSelectPlaylist={openPlaylist}
        />

        {/* Mobile : transparent, le quadrillage du fond (racine) reste visible. */}
        <main
          className={`flex min-w-0 flex-1 flex-col overflow-hidden md:rounded-panel md:bg-grid md:bg-panel md:pb-0 ${
            hasTrack
              ? 'pb-[calc(72px+64px+env(safe-area-inset-bottom)+16px)]'
              : 'pb-[calc(64px+env(safe-area-inset-bottom)+12px)]'
          }`}
        >
          <Header
            view={playlistRoute ? 'library' : view}
            query={query}
            onQueryChange={changeQuery}
            onSubmitQuery={() => navigate('search')}
            onOpenProfile={() => navigate('profile')}
          />

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {playlistRoute ? (
              <PlaylistDetail id={playlistRoute} onBack={closePlaylist} />
            ) : albumRoute ? (
              <AlbumDetail albumId={albumRoute} onBack={closeAlbum} />
            ) : artistRoute ? (
              <ArtistDetail artistId={artistRoute} onBack={closeArtist} />
            ) : (
              <>
                {view === 'home' && <Home onOpenAlbum={openAlbum} onOpenArtist={openArtist} />}
                {view === 'search' && <SearchView query={query} onSearch={changeQuery} />}
                {view === 'charts' && <ChartsView />}
                {view === 'library' && <LibraryView onSelect={openPlaylist} />}
                {view === 'artist' && <ArtistStudio />}
                {view === 'admin' && <Admin />}
                {view === 'profile' && (
                  <Profile onSelectPlaylist={openPlaylist} onNavigate={navigate} />
                )}
              </>
            )}
          </div>
        </main>

        {queueOpen && <QueuePanel />}
      </div>

      <Player onOpenArtist={openArtist} />
      <MobileNav view={playlistRoute ? 'library' : view} onNavigate={navigate} />
    </div>
  );
}
