import {
  QueryClient,
  focusManager,
  type QueryClientConfig,
} from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import Constants from 'expo-constants';
import { useEffect, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { startNetworkWatcher } from './network';
import { storage } from './storage';

const PERSIST_KEY = 'mixify.query-cache';
const ONE_DAY = 24 * 60 * 60 * 1000;

/**
 * Lectures mises en cache 5 min : les écrans s'ouvrent depuis le disque,
 * puis se revalident en arrière-plan si les données sont plus vieilles.
 */
const config: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: ONE_DAY,
      retry: 1,
      networkMode: 'offlineFirst',
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
};

export const queryClient = new QueryClient(config);

export const persister = createSyncStoragePersister({
  storage,
  key: PERSIST_KEY,
  throttleTime: 1_000,
});

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

/** Une mise à jour d'app invalide le cache persisté (version ou schéma). */
const CACHE_VERSION = 'v1';
const buster = `${Constants.expoConfig?.version ?? '1.0.0'}-${CACHE_VERSION}`;

export function QueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => startNetworkWatcher(), []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_DAY,
        buster,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.state.status === 'success',
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/** Déconnexion ou mise à jour : rien d'utilisateur ne reste sur le disque. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}

/** Taille approximative du cache persisté, pour l'écran Paramètres. */
export function queryCacheBytes(): number {
  return storage.getItem(PERSIST_KEY)?.length ?? 0;
}
