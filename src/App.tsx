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
import { ArtistStudio } from './views/ArtistStudio';
import { LibraryView, PlaylistDetail } from './views/Library';
import { SearchView } from './views/Search';
import { useAuthStore } from './store/authStore';
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem('mixify.onboarded') === '1';
    } catch {
      return true; // stockage indisponible : on ne bloque pas l'accès aux pages de compte
    }
  });
  const queueOpen = usePlayer((s) => s.queueOpen);
  const user = useAuthStore((s) => s.user);
  const authReady = useAuthStore((s) => s.ready);
  const initAuth = useAuthStore((s) => s.init);
  const loadFavorites = useLibraryStore((s) => s.loadFavorites);

  // Applique le thème (accent persistant) au montage.
  useEffect(() => {
    applyTheme({ ...theme, colors: { ...theme.colors, primary: getAccent() } });
  }, []);

  // Reprend la session enregistrée (token localStorage -> /api/auth/me).
  useEffect(() => {
    void initAuth();
  }, [initAuth]);

  // Charge les favoris du compte (cœurs des listes de titres).
  useEffect(() => {
    if (user) void loadFavorites();
  }, [user, loadFavorites]);

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
    setNav((current) => {
      const stack = current.stack.slice(0, current.cursor + 1);
      stack.push(next);
      return { stack, cursor: stack.length - 1 };
    });
  };

  const back = () =>
    setNav((current) => ({ ...current, cursor: Math.max(0, current.cursor - 1) }));

  const forward = () =>
    setNav((current) => ({
      ...current,
      cursor: Math.min(current.stack.length - 1, current.cursor + 1),
    }));

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

        <main className="bg-grid flex min-w-0 flex-1 flex-col overflow-hidden bg-panel md:rounded-panel">
          <Header
            view={playlistRoute ? 'library' : view}
            canGoBack={playlistRoute ? true : nav.cursor > 0}
            canGoForward={playlistRoute ? false : nav.cursor < nav.stack.length - 1}
            onBack={playlistRoute ? closePlaylist : back}
            onForward={forward}
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              if (value.trim() && (playlistRoute || view !== 'search')) navigate('search');
            }}
            onSubmitQuery={() => navigate('search')}
          />

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {playlistRoute ? (
              <PlaylistDetail id={playlistRoute} onBack={closePlaylist} />
            ) : (
              <>
                {view === 'home' && <Home />}
                {view === 'search' && <SearchView query={query} />}
                {view === 'library' && <LibraryView onSelect={openPlaylist} />}
                {view === 'artist' && <ArtistStudio />}
              </>
            )}
          </div>
        </main>

        {queueOpen && <QueuePanel />}
      </div>

      <Player />
      <MobileNav view={playlistRoute ? 'library' : view} onNavigate={navigate} />
    </div>
  );
}
