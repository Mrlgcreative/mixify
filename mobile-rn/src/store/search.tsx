import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

interface SearchContextValue {
  query: string;
  setQuery: (value: string) => void;
  clear: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/** Recherche partagée entre le Header et l'onglet Rechercher (comme sur le web). */
export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');

  const clear = useCallback(() => setQuery(''), []);

  const value = useMemo(() => ({ query, setQuery, clear }), [query, clear]);

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearchQuery(): SearchContextValue {
  const context = useContext(SearchContext);
  if (!context) throw new Error('useSearchQuery doit être utilisé dans SearchProvider');
  return context;
}
