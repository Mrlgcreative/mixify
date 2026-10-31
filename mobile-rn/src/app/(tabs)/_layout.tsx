import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Header } from '@/components/Header/Header';
import { MobileNav } from '@/components/MobileNav/MobileNav';
import {
  TabBarBlurTargetContext,
  TabBarScrollContext,
  type TabBarBlurTarget,
} from '@/components/MobileNav/TabBarScrollContext';
import { MiniPlayer } from '@/components/Player/MiniPlayer';
import { GlassNoise } from '@/components/common/GlassNoise/GlassNoise';
import { canPublish, useAuth } from '@/store/auth';
import { usePlayer } from '@/store/player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Verre natif disponible : on allège le fond pour laisser voir le liquide. */
const liquidGlass = isLiquidGlassAvailable();

/** Coquille mobile : en-tête, onglets, mini-lecteur et barre d'onglets. */
export default function TabsLayout() {
  const { user } = useAuth();
  const { current } = usePlayer();
  const insets = useSafeAreaInsets();
  const [collapsed, setCollapsed] = useState(false);
  const [progress] = useState(() => new Animated.Value(0));
  const [blurTarget, setBlurTarget] = useState<TabBarBlurTarget | null>(null);
  // Les écrans sont montés après le premier rendu : le premier clic est instantané
  // sans ralentir l'ouverture de l'accueil.
  const [preloaded, setPreloaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPreloaded(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const isCollapsed = collapsed && Boolean(current);
  const expandedHeight = current ? 140 : 70;
  const tabBarScrollState = useMemo(
    () => ({ collapsed, setCollapsed }),
    [collapsed],
  );
  useEffect(() => {
    const animation = Animated.spring(progress, {
      toValue: isCollapsed ? 1 : 0,
      stiffness: 280,
      damping: 28,
      mass: 0.7,
      overshootClamping: true,
      restDisplacementThreshold: 0.5,
      restSpeedThreshold: 0.5,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [isCollapsed, progress]);

  const expandedOpacity = progress.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 0, 0],
  });
  const compactOpacity = progress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0, 0, 1],
  });
  const expandedOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const compactOffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const revealExpandedCapsule = () => {
    setCollapsed(false);
  };

  return (
    <View style={styles.root}>
      <Header />
      <TabBarScrollContext.Provider value={tabBarScrollState}>
        <TabBarBlurTargetContext.Provider value={setBlurTarget}>
          <Tabs
            screenOptions={{
              headerShown: false,
              sceneStyle: { backgroundColor: 'transparent' },
              tabBarStyle: {
                position: 'absolute',
                backgroundColor: 'transparent',
                borderTopWidth: 0,
                elevation: 0,
              },
              lazy: !preloaded,
            }}
            tabBar={(props) => (
              <Animated.View
                pointerEvents="box-none"
                style={[
                  styles.bar,
                  { paddingBottom: Math.max(insets.bottom, 10) },
                ]}
              >
                <View
                  pointerEvents="box-none"
                  style={[styles.surface, { height: expandedHeight }]}
                >
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.collapsedSurface,
                      liquidGlass && styles.collapsedSurfaceGlass,
                      { opacity: compactOpacity },
                    ]}
                  >
                    {liquidGlass ? (
                      <GlassView
                        pointerEvents="none"
                        glassEffectStyle={{
                          style: isCollapsed ? 'regular' : 'none',
                          animate: true,
                          animationDuration: 0.3,
                        }}
                        tintColor="rgba(23,23,26,0.26)"
                        style={StyleSheet.absoluteFill}
                      />
                    ) : (
                      <Animated.View
                        pointerEvents="none"
                        style={StyleSheet.absoluteFill}
                      >
                        <BlurView
                          blurTarget={blurTarget ?? undefined}
                          blurMethod="dimezisBlurViewSdk31Plus"
                          intensity={55}
                          tint="dark"
                          style={[StyleSheet.absoluteFill, styles.androidBlur]}
                        />
                      </Animated.View>
                    )}
                    <GlassNoise />
                    <Animated.View
                      style={[
                        StyleSheet.absoluteFill,
                        styles.surfaceBorder,
                        { opacity: progress },
                      ]}
                    />
                  </Animated.View>
                  <Animated.View
                    pointerEvents={isCollapsed ? 'none' : 'auto'}
                    accessibilityElementsHidden={isCollapsed}
                    importantForAccessibility={isCollapsed ? 'no-hide-descendants' : 'auto'}
                    style={[
                      styles.expanded,
                      {
                        height: current ? 140 : 70,
                        opacity: expandedOpacity,
                        transform: [{ translateY: expandedOffset }],
                      },
                    ]}
                  >
                    <MiniPlayer
                      onExpand={revealExpandedCapsule}
                      blurTarget={blurTarget}
                    />
                    <MobileNav
                      state={props.state}
                      navigateToTab={props.navigateToTab}
                      onExpand={revealExpandedCapsule}
                      blurTarget={blurTarget}
                    />
                  </Animated.View>
                  {current ? (
                    <Animated.View
                      pointerEvents={isCollapsed ? 'auto' : 'none'}
                      onTouchStart={() => setCollapsed(false)}
                      accessibilityElementsHidden={!isCollapsed}
                      importantForAccessibility={
                        isCollapsed ? 'auto' : 'no-hide-descendants'
                      }
                      style={[
                        styles.compact,
                        {
                          opacity: compactOpacity,
                          transform: [{ translateY: compactOffset }],
                        },
                      ]}
                    >
                      <MobileNav
                        state={props.state}
                        navigateToTab={props.navigateToTab}
                        collapsed
                        onExpand={revealExpandedCapsule}
                      />
                      <View style={styles.compactDivider} />
                      <MiniPlayer
                        collapsed
                        onExpand={revealExpandedCapsule}
                      />
                    </Animated.View>
                  ) : null}
                </View>
              </Animated.View>
            )}
          >
            <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
            <Tabs.Screen name="search" options={{ title: 'Rechercher' }} />
            <Tabs.Screen name="charts" options={{ title: 'Classement' }} />
            <Tabs.Screen name="library" options={{ title: 'Bibliothèque' }} />
            <Tabs.Screen
              name="artist"
              options={{
                title: 'Artiste',
                lazy: !preloaded || !canPublish(user?.role),
              }}
            />
          </Tabs>
        </TabBarBlurTargetContext.Provider>
      </TabBarScrollContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  surface: {
    width: '100%',
    maxWidth: 508,
  },
  expanded: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  surfaceBorder: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  androidBlur: {
    backgroundColor: 'rgba(23,23,26,0.5)',
  },
  collapsedSurface: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(23,23,26,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  collapsedSurfaceGlass: {
    backgroundColor: 'rgba(23,23,26,0.28)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  compact: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    overflow: 'hidden',
  },
  compactDivider: {
    width: 1,
    height: 28,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
