import { onlineManager } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { useSyncExternalStore } from 'react';

export interface NetworkStatus {
  online: boolean;
  type: Network.NetworkStateType | null;
}

let state: NetworkStatus = { online: true, type: null };
const listeners = new Set<() => void>();

function publish(next: NetworkStatus) {
  if (next.online === state.online && next.type === state.type) return;
  state = next;
  onlineManager.setOnline(next.online);
  listeners.forEach((listener) => listener());
}

function apply(event: Network.NetworkState) {
  publish({
    online: event.isConnected !== false && event.isInternetReachable !== false,
    type: event.type ?? null,
  });
}

/** Écoute le réseau une seule fois ; renvoie la fonction de nettoyage. */
export function startNetworkWatcher(): () => void {
  void Network.getNetworkStateAsync()
    .then(apply)
    .catch(() => undefined);
  const subscription = Network.addNetworkStateListener(apply);
  return () => subscription.remove();
}

export function getNetworkStatus(): NetworkStatus {
  return state;
}

export function useNetworkStatus(): NetworkStatus {
  return useSyncExternalStore(subscribe, getNetworkStatus, getNetworkStatus);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
