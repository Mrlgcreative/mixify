import { LayoutDashboard, Music4, Upload, UserRound, type LucideIcon } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getArtistStats, getMyArtist } from '@/api/musicApi';
import { ErrorState } from '@/components/common/ErrorState/ErrorState';
import { Loading } from '@/components/common/Loading/Loading';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { useAsync } from '@/lib/useAsync';
import { colors } from '@/theme/theme';
import { OverviewTab } from './OverviewTab';
import { ProfileFormTab } from './ProfileFormTab';
import { PublishTab } from './PublishTab';
import { TracksTab } from './TracksTab';

type Tab = 'overview' | 'tracks' | 'publish' | 'profile';

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: 'tracks', label: 'Morceaux', icon: Music4 },
  { id: 'publish', label: 'Publier', icon: Upload },
  { id: 'profile', label: 'Profil', icon: UserRound },
];

/** Espace artiste : tableau de bord, catalogue, publication et profil. */
export function ArtistStudio() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const dashboard = useAsync('my-artist', () => getMyArtist());
  const stats = useAsync('artist-stats', () => getArtistStats());
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-artist'] });
    void queryClient.invalidateQueries({ queryKey: ['artist-stats'] });
  };
  const artist = dashboard.data?.artist;
  // Sans profil, l'onglet Vue d'ensemble bascule sur le formulaire de création.
  const noArtist = !dashboard.loading && !dashboard.error && dashboard.data === null;
  const activeTab = noArtist && tab === 'overview' ? 'profile' : tab;

  if (dashboard.loading && !dashboard.data) {
    return (
      <Screen>
        <Loading label="Chargement de l’espace artiste…" />
      </Screen>
    );
  }

  if (dashboard.error) {
    return (
      <Screen>
        <ErrorState
          title="Espace artiste indisponible"
          error={dashboard.error}
          onRetry={refresh}
        />
      </Screen>
    );
  }

  const empty = (
    <View style={styles.empty}>
      <T weight="bold" style={styles.emptyTitle}>
        Crée ton profil artiste
      </T>
      <T color={colors.muted} style={styles.emptyText}>
        Un profil est nécessaire pour publier des morceaux. Tu pourras ensuite gérer ton
        catalogue, tes informations publiques et tes sorties.
      </T>
      <Pressable
        accessibilityRole="button"
        onPress={() => setTab('profile')}
        style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]}
      >
        <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 13 }}>
          Créer mon profil
        </T>
      </Pressable>
    </View>
  );

  return (
    <Screen>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsWrap}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Icon size={16} color={active ? colors.primary : colors.muted} />
              <T
                weight="semibold"
                color={active ? colors.text : colors.muted}
                style={{ fontSize: 12 }}
              >
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      {activeTab === 'overview' &&
        (dashboard.data ? (
          <OverviewTab
            data={dashboard.data}
            stats={stats.data}
            onTab={setTab}
          />
        ) : (
          empty
        ))}

      {activeTab === 'tracks' &&
        (dashboard.data ? (
          <TracksTab
            tracks={dashboard.data.tracks}
            onRefresh={refresh}
            onPublish={() => setTab('publish')}
          />
        ) : (
          empty
        ))}

      {activeTab === 'publish' ? <PublishTab onPublished={refresh} /> : null}

      {activeTab === 'profile' ? (
        <ProfileFormTab
          key={artist?.id ?? 'nouveau'}
          artist={artist}
          onSaved={() => {
            refresh();
            setTab('overview');
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsWrap: { marginHorizontal: -16, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabs: { paddingHorizontal: 16, gap: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 13,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  empty: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: colors.card,
    padding: 20,
  },
  emptyTitle: { fontSize: 20 },
  emptyText: { fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 420 },
  emptyButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
});
