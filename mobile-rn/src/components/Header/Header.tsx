import { useRouter } from 'expo-router';
import { Disc, Music, Search as SearchIcon, UserRound, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { search } from '@/api/musicApi';
import type { SearchResults } from '@/types/music';
import { useAuth } from '@/store/auth';
import { useSearchQuery } from '@/store/search';
import { colors, fontScale } from '@/theme/theme';
import { Avatar } from '../common/Avatar/Avatar';
import { Cover } from '../common/Cover/Cover';
import { Logo } from '../common/Logo/Logo';
import { T } from '../common/T/T';

const EMPTY: SearchResults = { tracks: [], albums: [], artists: [], playlists: [] };

/** En-tête permanent : marque, recherche avec suggestions, compte. */
export function Header() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { query, setQuery } = useSearchQuery();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchResults>(EMPTY);

  useEffect(() => {
    const needle = query.trim();
    let active = true;
    const timer = setTimeout(
      () => {
        if (needle.length < 2) {
          setSuggestions(EMPTY);
          return;
        }
        search(needle)
          .then((result) => {
            if (active) setSuggestions(result);
          })
          .catch(() => {
            if (active) setSuggestions(EMPTY);
          });
      },
      needle.length < 2 ? 0 : 300,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  const submit = () => {
    setFocused(false);
    Keyboard.dismiss();
    router.navigate('/search');
  };

  const applySuggestion = (value: string) => {
    setQuery(value);
    submit();
  };

  const showSuggestions = focused && query.trim().length >= 2;

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }]}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Accueil" onPress={() => router.navigate('/')}>
          <Logo size={24} withWordmark={false} />
        </Pressable>

        <View style={styles.searchBox}>
          <SearchIcon size={17} color={colors.muted} style={styles.searchIcon} />
          <TextInput
            value={query}
            onChangeText={(value) => {
              setQuery(value);
              if (value.trim()) router.navigate('/search');
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onSubmitEditing={submit}
            placeholder="Rechercher un titre, un artiste…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Rechercher"
            returnKeyType="search"
            style={styles.input}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Effacer la recherche"
              onPress={() => {
                setQuery('');
                router.navigate('/search');
              }}
              hitSlop={8}
              style={styles.clear}
            >
              <X size={14} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mon profil"
          onPress={() => router.push('/profile')}
          hitSlop={6}
        >
          {user ? (
            <Avatar user={user} size={34} />
          ) : (
            <View style={styles.avatarFallback}>
              <UserRound size={17} color={colors.subtle} />
            </View>
          )}
        </Pressable>
      </View>

      {showSuggestions ? (
        <View style={[styles.suggestions, { top: insets.top + 52 }]}>
          {suggestions.artists.length > 0 ? (
            <View>
              <SectionLabel icon={<UserRound size={13} color={colors.primary} />} label="Artistes" />
              {suggestions.artists.slice(0, 3).map((artist) => (
                <Pressable
                  key={artist.id}
                  onPress={() => applySuggestion(artist.name)}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.elevated }]}
                >
                  <Cover seed={artist.id} title={artist.name} imageUrl={artist.imageUrl} size={36} round={18} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="medium" numberOfLines={1} style={styles.suggestionTitle}>
                      {artist.name}
                    </T>
                    <T color={colors.muted} style={styles.suggestionSub}>
                      Artiste
                    </T>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {suggestions.tracks.length > 0 ? (
            <View>
              <SectionLabel icon={<Music size={13} color={colors.primary} />} label="Titres" />
              {suggestions.tracks.slice(0, 3).map((track) => (
                <Pressable
                  key={track.id}
                  onPress={() => applySuggestion(track.title)}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.elevated }]}
                >
                  <Cover
                    seed={track.id}
                    title={track.title}
                    imageUrl={track.album?.coverUrl ?? track.coverUrl}
                    size={36}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T weight="medium" numberOfLines={1} style={styles.suggestionTitle}>
                      {track.title}
                    </T>
                    <T color={colors.muted} numberOfLines={1} style={styles.suggestionSub}>
                      {track.artist.name}
                    </T>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}

          {suggestions.albums.length > 0 ? (
            <View>
              <SectionLabel icon={<Disc size={13} color={colors.primary} />} label="Albums" />
              {suggestions.albums.slice(0, 2).map((album) => (
                <Pressable
                  key={album.id}
                  onPress={() => applySuggestion(album.title)}
                  style={({ pressed }) => [styles.suggestion, pressed && { backgroundColor: colors.elevated }]}
                >
                  <Cover seed={album.id} title={album.title} imageUrl={album.coverUrl} size={36} />
                  <T weight="medium" numberOfLines={1} style={[styles.suggestionTitle, { flex: 1 }]}>
                    {album.title}
                  </T>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Pressable
            onPress={submit}
            style={({ pressed }) => [styles.allResults, pressed && { backgroundColor: colors.elevated }]}
          >
            <SearchIcon size={15} color={colors.primary} />
            <T color={colors.primary} numberOfLines={1} style={{ fontSize: 13 }}>
              Voir tous les résultats pour « {query} »
            </T>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.sectionLabel}>
      {icon}
      <T color={colors.muted} weight="semibold" style={styles.sectionLabelText}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: colors.panel,
    zIndex: 40,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchBox: { flex: 1, justifyContent: 'center' },
  searchIcon: { position: 'absolute', left: 11, zIndex: 1 },
  input: {
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.elevated,
    paddingLeft: 34,
    paddingRight: 32,
    color: colors.text,
    fontFamily: 'Inter_400Regular',
    fontSize: 13 * fontScale,
  },
  clear: { position: 'absolute', right: 10 },
  avatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionLabelText: { fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase' },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionTitle: { fontSize: 13 },
  suggestionSub: { fontSize: 11, marginTop: 1 },
  allResults: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
