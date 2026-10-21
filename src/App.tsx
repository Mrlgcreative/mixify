import { useEffect, useState } from 'react';

import { Header } from './components/Header/Header';
import { Player } from './components/Player/Player';
import { QueuePanel } from './components/Queue/QueuePanel';
import { Sidebar } from './components/Sidebar/Sidebar';
import { Home } from './views/Home';
import { LibraryView } from './views/Library';
import { SearchView } from './views/Search';
import { usePlayer } from './store/playerStore';
import { applyTheme, getAccent, theme } from './theme/theme';
import type { ViewName } from './types/music';

interface Navigation {
  stack: ViewName[];
  cursor: number;
}

export default function App() {
  const [nav, setNav] = useState<Navigation>({ stack: ['home'], cursor: 0 });
  const [query, setQuery] = useState('');
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const queueOpen = usePlayer((s) => s.queueOpen);

  // Applique le thème (accent persistant) au montage.
  useEffect(() => {
    applyTheme({ ...theme, colors: { ...theme.colors, primary: getAccent() } });
  }, []);

  const view = nav.stack[nav.cursor];

  const navigate = (next: ViewName) =>
    setNav((current) => {
      const stack = current.stack.slice(0, current.cursor + 1);
      stack.push(next);
      return { stack, cursor: stack.length - 1 };
    });

  const back = () =>
    setNav((current) => ({ ...current, cursor: Math.max(0, current.cursor - 1) }));

  const forward = () =>
    setNav((current) => ({
      ...current,
      cursor: Math.min(current.stack.length - 1, current.cursor + 1),
    }));

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-text">
      <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-2">
        <Sidebar
          view={view}
          onNavigate={navigate}
          onSelectPlaylist={(id) => {
            setPlaylistId(id);
            navigate('library');
          }}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel bg-panel">
          <Header
            view={view}
            canGoBack={nav.cursor > 0}
            canGoForward={nav.cursor < nav.stack.length - 1}
            onBack={back}
            onForward={forward}
            query={query}
            onQueryChange={(value) => {
              setQuery(value);
              if (value.trim() && view !== 'search') navigate('search');
            }}
            onSubmitQuery={() => navigate('search')}
          />

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            {view === 'home' && <Home />}
            {view === 'search' && <SearchView query={query} />}
            {view === 'library' && (
              <LibraryView selectedId={playlistId} onSelect={setPlaylistId} />
            )}
          </div>
        </main>

        {queueOpen && <QueuePanel />}
      </div>

      <Player />
    </div>
  );
}
