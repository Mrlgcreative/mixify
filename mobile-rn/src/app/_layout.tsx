import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import splashIcon from '../../assets/splash-icon.png';

import { GridBackground } from '@/components/common/GridBackground/GridBackground';
import { OfflineBanner } from '@/components/common/OfflineBanner/OfflineBanner';
import { Onboarding } from '@/components/Onboarding/Onboarding';
import { pruneAudioCache } from '@/lib/audioCache';
import { QueryProvider } from '@/lib/query';
import { AuthProvider, useAuth } from '@/store/auth';
import { FollowsProvider } from '@/store/follows';
import { LibraryProvider } from '@/store/library';
import { PlayerProvider } from '@/store/player';
import { SearchProvider } from '@/store/search';
import { colors } from '@/theme/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    pruneAudioCache();
  }, []);

  if (!fontsLoaded) {
    return <Splash />;
  }

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <AuthProvider>
          <SearchProvider>
            <LibraryProvider>
              <FollowsProvider>
                <PlayerProvider>
                  <View style={{ flex: 1, backgroundColor: colors.bg }}>
                    <GridBackground />
                    <StatusBar style="light" />
                    <OfflineBanner />
                    <Gate />
                  </View>
                </PlayerProvider>
              </FollowsProvider>
            </LibraryProvider>
          </SearchProvider>
        </AuthProvider>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

/** Écran d'attente : le visuel du splash natif, y compris sous Expo Go. */
function Splash() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
      <Image
        source={splashIcon}
        style={{ width: 220, height: 220 }}
        resizeMode="contain"
        alt="Mixify"
      />
    </View>
  );
}

/** Comme le web : aucune navigation sans session ; l'onboarding et l'auth prennent tout. */
function Gate() {
  const { user, ready } = useAuth();

  if (!ready) return <Splash />;

  if (!user) return <Onboarding />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="artist/[id]" />
      <Stack.Screen name="playlist/[id]" />
      <Stack.Screen name="now-playing" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
