import Constants from 'expo-constants';
import Storage from 'expo-sqlite/kv-store';

/**
 * MMKV natif n'existe pas dans Expo Go : le KV store SQLite d'Expo prend le
 * relais avec la même API synchrone, donc l'hydratation reste immédiate.
 */
const inExpoGo = Constants.expoGoConfig != null;

function openMmkv() {
  if (inExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- module natif absent d'Expo Go
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    return createMMKV({ id: 'mixify' });
  } catch {
    return null;
  }
}

export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const mmkv = openMmkv();

export const storage: SyncStorage = mmkv
  ? {
      getItem: (key) => mmkv.getString(key) ?? null,
      setItem: (key, value) => mmkv.set(key, value),
      removeItem: (key) => mmkv.remove(key),
    }
  : {
      getItem: (key) => Storage.getItemSync(key),
      setItem: (key, value) => Storage.setItemSync(key, value),
      removeItem: (key) => Storage.removeItemSync(key),
    };

/** `mmkv` sur un build natif, `sqlite` dans Expo Go. */
export const storageBackend = mmkv ? 'mmkv' : 'sqlite';
