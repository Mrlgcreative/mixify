import { LogOut, Trash2 } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/common/T/T';
import { confirm, notify } from '@/lib/dialogs';
import { API_URL } from '@/api/musicApi';
import {
  clearAudioCache,
  getAudioCacheStats,
  getAudioLimit,
  setAudioLimit,
} from '@/lib/audioCache';
import { formatBytes } from '@/lib/format';
import { getMetrics, resetMetrics } from '@/lib/metrics';
import { clearQueryCache, queryCacheBytes } from '@/lib/query';
import { storageBackend } from '@/lib/storage';
import { useAuth } from '@/store/auth';
import { usePlayer } from '@/store/player';
import { colors, radius } from '@/theme/theme';
import type { TransitionMode } from '@/types/music';

const OPTIONS: Array<{ id: TransitionMode; label: string; hint: string }> = [
  { id: 'off', label: 'Désactivé', hint: 'Les titres s’enchaînent sans fondu.' },
  { id: 'automix', label: 'AutoMix', hint: 'Fondu de 10 s, tempo aligné quand les BPM sont connus.' },
  { id: 'crossfade', label: 'Fondu enchaîné', hint: 'Fondu simple, durée réglable.' },
];

const PRESETS = [4, 8, 12];
const LIMITS_MB = [250, 500, 1000];

/** Onglet Paramètres : transitions, cache hors ligne et session. */
export function SettingsTab() {
  const { logout, deleteAccount } = useAuth();
  const {
    transitionStyle,
    setTransitionStyle,
    crossfadeSeconds,
    setCrossfadeSeconds,
  } = usePlayer();
  const [cache, setCache] = useState(() => snapshot());
  const [deletingAccount, setDeletingAccount] = useState(false);

  async function openPublicPage(path: string) {
    try {
      await Linking.openURL(`${API_URL}${path}`);
    } catch {
      notify('Page inaccessible', 'Vérifie ta connexion puis réessaie.');
    }
  }

  async function removeAccount() {
    const accepted = await confirm(
      'Supprimer définitivement le compte ?',
      'Cette action supprimera ton compte, ton profil artiste, tes morceaux publiés et les données associées. Elle est irréversible.',
      'Supprimer le compte',
      true,
    );
    if (!accepted) return;

    setDeletingAccount(true);
    try {
      await deleteAccount();
      notify('Compte supprimé', 'Ton compte et les données associées ont été supprimés.');
    } catch (error) {
      notify(
        'Suppression impossible',
        error instanceof Error ? error.message : 'Réessaie ou contacte le support.',
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  function refresh() {
    setCache(snapshot());
  }

  const hitRate =
    cache.metrics.reads > 0
      ? Math.round((cache.metrics.hits / cache.metrics.reads) * 100)
      : null;
  const startMs =
    cache.metrics.playbackStarts > 0
      ? Math.round(cache.metrics.playbackStartMs / cache.metrics.playbackStarts)
      : null;
  const limit = getAudioLimit();

  return (
    <View style={{ gap: 16 }}>
      <View style={styles.card}>
        <View style={styles.section}>
          <T weight="semibold" style={{ fontSize: 13 }}>
            Transitions entre titres
          </T>
          <T color={colors.muted} style={styles.hint}>
            Comme dans Apple Music : le fondu prépare le titre suivant sur une seconde platine.
            L’AutoMix dure environ 10 s, le fondu enchaîné se règle à la main.
          </T>
          <View style={styles.options}>
            {OPTIONS.map((option) => {
              const selected = transitionStyle === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setTransitionStyle(option.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <T
                    weight="semibold"
                    color={selected ? colors.primary : colors.text}
                    style={{ fontSize: 12 }}
                  >
                    {option.label}
                  </T>
                  <T color={colors.muted} style={{ fontSize: 10, marginTop: 2, lineHeight: 14 }}>
                    {option.hint}
                  </T>
                </Pressable>
              );
            })}
          </View>

          {transitionStyle === 'crossfade' ? (
            <View style={styles.duration}>
              <View style={styles.durationHead}>
                <T weight="semibold" style={{ fontSize: 12 }}>
                  Durée du fondu
                </T>
                <T weight="bold" color={colors.primary} style={{ fontSize: 12 }}>
                  {crossfadeSeconds} s
                </T>
              </View>
              <View style={styles.presets}>
                {PRESETS.map((preset) => {
                  const selected = crossfadeSeconds === preset;
                  return (
                    <Pressable
                      key={preset}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setCrossfadeSeconds(preset)}
                      style={[styles.preset, selected && styles.optionSelected]}
                    >
                      <T
                        weight="semibold"
                        color={selected ? colors.primary : colors.text}
                        style={{ fontSize: 12 }}
                      >
                        {preset} s
                      </T>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <T color={colors.muted} style={styles.note}>
            Le titre suivant est préchargé (Wi-Fi toujours, données mobiles si la batterie dépasse
            30 %). L’AutoMix aligne le tempo quand les BPM sont connus, sans analyse harmonique.
          </T>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.section}>
          <T weight="semibold" style={{ fontSize: 13 }}>
            Cache et stockage
          </T>
          <T color={colors.muted} style={styles.hint}>
            Les pages déjà consultées et les titres écoutés restent disponibles hors ligne. Le cache
            se vide tout seul au-delà de la limite choisie.
          </T>

          <View style={styles.stats}>
            <Row label="Données des pages" value={formatBytes(cache.queries)} />
            <Row
              label="Audio hors ligne"
              value={`${formatBytes(cache.audio.bytes)} / ${formatBytes(cache.audio.limit)}`}
            />
            <Row label="Titres en cache" value={`${cache.audio.count} titres`} />
            <Row label="Stockage local" value={cache.backend} />
            <Row
              label="Efficacité du cache"
              value={hitRate == null ? '—' : `${hitRate} % de ${cache.metrics.reads} lectures`}
            />
            <Row
              label="Démarrage de lecture"
              value={startMs == null ? '—' : `${startMs} ms en moyenne`}
            />
          </View>

          <T color={colors.muted} style={[styles.note, { marginTop: 14 }]}>
            Limite de stockage audio
          </T>
          <View style={styles.options}>
            {LIMITS_MB.map((mb) => {
              const selected = limit === mb * 1024 * 1024;
              return (
                <Pressable
                  key={mb}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setAudioLimit(mb * 1024 * 1024);
                    refresh();
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <T
                    weight="semibold"
                    color={selected ? colors.primary : colors.text}
                    style={{ fontSize: 12 }}
                  >
                    {mb} Mo
                  </T>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                clearAudioCache();
                refresh();
              }}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
            >
              <Trash2 size={14} color={colors.text} />
              <T weight="semibold" style={{ fontSize: 11 }}>
                Vider l’audio
              </T>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void clearQueryCache();
                resetMetrics();
                refresh();
              }}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
            >
              <Trash2 size={14} color={colors.text} />
              <T weight="semibold" style={{ fontSize: 11 }}>
                Vider les pages
              </T>
            </Pressable>
          </View>
          <T color={colors.muted} style={styles.note}>
            Vider l’audio interrompt la lecture du titre en cours s’il venait du cache.
          </T>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.section}>
          <T weight="semibold" style={{ fontSize: 13 }}>
            Session
          </T>
          <T color={colors.muted} style={styles.hint}>
            Déconnecte ce téléphone. Votre historique et vos abonnements restent liés au compte.
          </T>
          <Pressable
            accessibilityRole="button"
            onPress={() => void logout()}
            style={({ pressed }) => [styles.logout, pressed && { opacity: 0.8 }]}
          >
            <LogOut size={15} color={colors.text} />
            <T weight="semibold" style={{ fontSize: 12 }}>
              Se déconnecter
            </T>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.section}>
          <T weight="semibold" style={{ fontSize: 13 }}>
            Confidentialité
          </T>
          <T color={colors.muted} style={styles.hint}>
            Consulte la politique de confidentialité ou demande la suppression de ton compte et
            des données associées.
          </T>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="link"
              onPress={() => void openPublicPage('/privacy')}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
            >
              <T weight="semibold" style={{ fontSize: 11 }}>Politique de confidentialité</T>
            </Pressable>
            <Pressable
              accessibilityRole="link"
              onPress={() => void openPublicPage('/delete-account')}
              style={({ pressed }) => [styles.action, pressed && { opacity: 0.8 }]}
            >
              <T weight="semibold" style={{ fontSize: 11 }}>Demande web de suppression</T>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={deletingAccount}
            onPress={() => void removeAccount()}
            style={({ pressed }) => [
              styles.deleteAccount,
              (pressed || deletingAccount) && { opacity: 0.65 },
            ]}
          >
            <Trash2 size={15} color="#ff7777" />
            <T weight="semibold" color="#ff7777" style={{ fontSize: 12 }}>
              {deletingAccount ? 'Suppression…' : 'Supprimer mon compte'}
            </T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function snapshot() {
  return {
    audio: getAudioCacheStats(),
    metrics: getMetrics(),
    // `queryCacheBytes` compte des caractères UTF-16 : deux octets chacun.
    queries: queryCacheBytes() * 2,
    backend: storageBackend === 'mmkv' ? 'MMKV' : 'SQLite',
  };
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <T color={colors.muted} style={{ fontSize: 11 }}>
        {label}
      </T>
      <T weight="semibold" style={{ fontSize: 11 }}>
        {value}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  section: { padding: 16 },
  hint: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  options: { gap: 8, marginTop: 12 },
  option: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: 'rgba(243,194,75,0.12)' },
  duration: { marginTop: 14 },
  durationHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  presets: { flexDirection: 'row', gap: 8, marginTop: 8 },
  preset: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 8,
  },
  note: { fontSize: 10, marginTop: 10, lineHeight: 15 },
  stats: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logout: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  deleteAccount: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,119,119,0.5)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
});
