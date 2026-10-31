import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  BarChart3,
  Heart,
  History as HistoryIcon,
  ListMusic,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getHistory, getLibrary } from '@/api/musicApi';
import { Avatar } from '@/components/common/Avatar/Avatar';
import { Screen } from '@/components/common/Screen/Screen';
import { T } from '@/components/common/T/T';
import { useAsync } from '@/lib/useAsync';
import { useAuth } from '@/store/auth';
import { colors, radius } from '@/theme/theme';
import { AccountTab } from './AccountTab';
import { FavoritesTab } from './FavoritesTab';
import { FollowersTab } from './FollowersTab';
import { HistoryTab } from './HistoryTab';
import { PlaylistsTab } from './PlaylistsTab';
import { ROLE_LABELS } from './roleLabels';
import { SettingsTab } from './SettingsTab';
import { StatsTab } from './StatsTab';

type Tab = 'account' | 'playlists' | 'favorites' | 'settings' | 'history' | 'stats' | 'followers';

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: 'account', label: 'Compte', icon: UserRound },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'favorites', label: 'Favoris', icon: Heart },
  { id: 'settings', label: 'Paramètres', icon: Settings },
  { id: 'history', label: 'Historique', icon: HistoryIcon },
  { id: 'stats', label: 'Statistiques', icon: BarChart3 },
  { id: 'followers', label: 'Abonnés', icon: Users },
];

/** Profil du compte : 7 onglets, comme la vue web. */
export function Profile() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('account');
  const [historyRevision, setHistoryRevision] = useState(0);

  const library = useAsync('library', () => getLibrary());
  const history = useAsync('history', () => getHistory(), [historyRevision]);

  if (!user) return null;

  return (
    <Screen bottomSpace={180}>
      <LinearGradient
        colors={['rgba(243,194,75,0.25)', colors.elevated, colors.panel]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <Avatar user={user} size={76} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T color="rgba(255,255,255,0.6)" weight="semibold" style={styles.kicker}>
              Profil
            </T>
            <T weight="extrabold" numberOfLines={1} style={styles.name}>
              {user.name || 'Auditeur'}
            </T>
            <T color={colors.muted} numberOfLines={1} style={styles.email}>
              {user.email}
            </T>
          </View>
        </View>
        <View style={styles.roleBadge}>
          <T color={colors.subtle} weight="semibold" style={styles.roleText}>
            {ROLE_LABELS[user.role] ?? user.role}
          </T>
        </View>
      </LinearGradient>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        style={styles.tabsWrap}
      >
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => setTab(item.id)}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Icon size={15} color={active ? colors.text : colors.muted} />
              <T
                weight="medium"
                color={active ? colors.text : colors.muted}
                style={{ fontSize: 12 }}
              >
                {item.label}
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.body}>
        {tab === 'account' ? <AccountTab /> : null}
        {tab === 'playlists' ? (
          <PlaylistsTab library={library} onManage={() => router.navigate('/library')} />
        ) : null}
        {tab === 'favorites' ? <FavoritesTab library={library} /> : null}
        {tab === 'settings' ? <SettingsTab /> : null}
        {tab === 'history' ? (
          <HistoryTab
            history={history}
            onCleared={() => setHistoryRevision((value) => value + 1)}
          />
        ) : null}
        {tab === 'stats' ? <StatsTab history={history} library={library} /> : null}
        {tab === 'followers' ? <FollowersTab /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginTop: 8,
    borderRadius: radius.panel,
    padding: 18,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  kicker: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
  name: { fontSize: 24, letterSpacing: -0.5, marginTop: 2 },
  email: { fontSize: 12, marginTop: 2 },
  roleBadge: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleText: { fontSize: 9, letterSpacing: 0.8, textTransform: 'uppercase' },
  tabsWrap: { marginTop: 22, marginHorizontal: -16 },
  tabs: { paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  body: { paddingTop: 22 },
});
