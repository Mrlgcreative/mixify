import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Cover } from '@/components/common/Cover/Cover';
import { Loading } from '@/components/common/Loading/Loading';
import { T } from '@/components/common/T/T';
import { FollowButton } from '@/components/Follow/FollowButton';
import { formatDate } from '@/lib/format';
import { canPublish, useAuth } from '@/store/auth';
import { useFollows } from '@/store/follows';
import { colors, radius } from '@/theme/theme';

/** Onglet Abonnés : abonnés du profil artiste et artistes suivis. */
export function FollowersTab() {
  const router = useRouter();
  const { user } = useAuth();
  const { following, followers, myArtist, loaded } = useFollows();

  if (!loaded) return <Loading label="Chargement des abonnements…" />;

  return (
    <View style={{ gap: 28 }}>
      <View>
        <T weight="bold" style={styles.title}>
          Vos abonnés
        </T>
        {myArtist ? (
          <>
            <T color={colors.muted} style={styles.subtitle}>
              {myArtist.name} · {followers.length} abonné(s)
            </T>
            {followers.length === 0 ? (
              <T color={colors.muted} style={styles.empty}>
                Personne ne suit encore votre profil artiste.
              </T>
            ) : (
              followers.map((follower) => (
                <View key={follower.id} style={styles.row}>
                  <Cover
                    seed={follower.id}
                    title={follower.name}
                    imageUrl={follower.avatarUrl}
                    size={40}
                    round={20}
                    textSize={11}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="medium" numberOfLines={1} style={{ fontSize: 12 }}>
                      {follower.name}
                    </T>
                    {follower.followedAt ? (
                      <T color={colors.muted} style={{ fontSize: 10 }}>
                        Depuis le {formatDate(follower.followedAt)}
                      </T>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <View style={styles.card}>
            <T weight="semibold" style={{ fontSize: 13 }}>
              Pas encore de profil artiste
            </T>
            <T color={colors.muted} style={styles.cardText}>
              Vos abonnés apparaîtront ici dès que votre compte aura un profil artiste.
            </T>
            {canPublish(user?.role) ? (
              <Pressable
                onPress={() => router.navigate('/artist')}
                style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
              >
                <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 12 }}>
                  Ouvrir l’espace artiste
                </T>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <View>
        <View style={styles.followingHead}>
          <View style={{ flex: 1 }}>
            <T weight="bold" style={styles.title}>
              Vos abonnements
            </T>
            <T color={colors.muted} style={styles.subtitle}>
              {following.length} artiste(s) suivi(s)
            </T>
          </View>
          <Pressable
            onPress={() => router.navigate('/search')}
            style={({ pressed }) => [styles.discover, pressed && { opacity: 0.8 }]}
          >
            <T weight="semibold" style={{ fontSize: 11 }}>
              Découvrir
            </T>
          </Pressable>
        </View>

        {following.length === 0 ? (
          <T color={colors.muted} style={styles.empty}>
            Aucun abonnement. Suivez un artiste depuis les résultats de recherche.
          </T>
        ) : (
          following.map((artist) => (
            <Pressable
              key={artist.id}
              onPress={() => router.push(`/artist/${artist.id}`)}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.elevated }]}
            >
              <Cover
                seed={artist.id}
                title={artist.name}
                imageUrl={artist.imageUrl}
                size={42}
                round={21}
                textSize={11}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="medium" numberOfLines={1} style={{ fontSize: 12 }}>
                  {artist.name}
                </T>
                <T color={colors.muted} style={{ fontSize: 10 }}>
                  {artist.followers} abonné{artist.followers > 1 ? 's' : ''}
                </T>
              </View>
              <FollowButton artist={artist} compact />
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19 },
  subtitle: { fontSize: 12, marginTop: 2 },
  empty: { fontSize: 12, marginTop: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  card: {
    marginTop: 12,
    padding: 16,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  cardText: { fontSize: 12, marginTop: 5, lineHeight: 18 },
  cta: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  followingHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  discover: {
    backgroundColor: colors.elevated,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
