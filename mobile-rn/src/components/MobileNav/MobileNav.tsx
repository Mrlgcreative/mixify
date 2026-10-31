import { BarChart3, Home, Library, Mic2, Search, type LucideIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { canPublish, useAuth } from '@/store/auth';
import { colors } from '@/theme/theme';
import { GlassNoise } from '../common/GlassNoise/GlassNoise';
import type { TabBarBlurTarget } from './TabBarScrollContext';

interface MobileNavProps {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  navigateToTab: (routeKey: string) => void;
  collapsed?: boolean;
  onExpand?: () => void;
  blurTarget?: TabBarBlurTarget | null;
}

interface Item {
  name: string;
  label: string;
  icon: LucideIcon;
}

/** Ordre exact de la barre mobile web : Accueil au centre. */
const ITEMS: Item[] = [
  { name: 'search', label: 'Rechercher', icon: Search },
  { name: 'charts', label: 'Classement', icon: BarChart3 },
  { name: 'index', label: 'Accueil', icon: Home },
  { name: 'library', label: 'Bibliothèque', icon: Library },
  { name: 'artist', label: 'Artiste', icon: Mic2 },
];

/** Verre natif disponible : on allège le fond pour laisser voir le liquide. */
const liquidGlass = isLiquidGlassAvailable();

/** Barre flottante : pastille dorée pleine sur l'onglet actif. */
export function MobileNav({
  state,
  navigateToTab,
  collapsed = false,
  onExpand,
  blurTarget,
}: MobileNavProps) {
  const { user } = useAuth();
  const [pressed, setPressed] = useState<string | null>(null);
  const canAccessArtist = canPublish(user?.role);
  const items = ITEMS.filter((item) => item.name !== 'artist' || canAccessArtist);
  const activeRoute = state.routes[state.index]?.name;
  const visibleItems = collapsed ? items.filter((item) => item.name === activeRoute) : items;

  /** Surbrillance immédiate avant même que l'écran ne soit affiché. */
  const highlight = (name: string) => {
    setPressed(name);
    setTimeout(() => setPressed((current) => (current === name ? null : current)), 500);
  };

  return (
    <View style={[styles.wrap, collapsed && styles.collapsedWrap]}>
      <View style={[styles.bar, liquidGlass && styles.barGlass, collapsed && styles.collapsedBar]}>
        {!collapsed ? (
          <View pointerEvents="box-none" style={styles.glassClip}>
            {liquidGlass ? (
              <GlassView
                glassEffectStyle="regular"
                tintColor="rgba(23,23,26,0.22)"
                isInteractive
                style={StyleSheet.absoluteFill}
              />
            ) : (
              <BlurView
                blurTarget={blurTarget ?? undefined}
                blurMethod="dimezisBlurViewSdk31Plus"
                intensity={55}
                tint="dark"
                style={StyleSheet.absoluteFill}
              />
            )}
            <GlassNoise />
          </View>
        ) : null}
        {visibleItems.map((item) => {
          const route = state.routes.find((candidate) => candidate.name === item.name);
          if (!route) return null;
          const active = activeRoute === item.name;
          const highlighted = active || pressed === item.name;
          const Icon = item.icon;
          return (
            <Pressable
              key={item.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={item.label}
              onPressIn={() => {
                onExpand?.();
                highlight(item.name);
                if (!active) {
                  // Changement au contact : pas d'attente du relâchement.
                  navigateToTab(route.key);
                }
              }}
              onPress={() => {
                onExpand?.();
                // Repli pour les lecteurs d'écran, qui n'émettent pas toujours onPressIn.
                if (!active) navigateToTab(route.key);
              }}
              style={[styles.item, collapsed && styles.collapsedItem]}
            >
              <View style={styles.iconWrap}>
                {highlighted ? (
                  <View pointerEvents="none" style={styles.iconActive} />
                ) : null}
                <Icon
                  size={collapsed ? 19 : 21}
                  color={highlighted ? colors.primaryContrast : colors.text}
                  strokeWidth={highlighted ? 2.3 : 2}
                />
              </View>
            </Pressable>
          );
        })}
        {!collapsed && !canAccessArtist ? (
          <View
            key="artist-spacer"
            accessible={false}
            importantForAccessibility="no"
            pointerEvents="none"
            style={styles.item}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 6,
    alignItems: 'center',
  },
  collapsedWrap: {
    width: 50,
    paddingTop: 0,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(23,23,26,0.58)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  barGlass: {
    backgroundColor: 'rgba(23,23,26,0.24)',
    borderColor: 'rgba(255,255,255,0.2)',
  },
  collapsedBar: {
    width: '100%',
    maxWidth: undefined,
    height: 64,
    borderWidth: 0,
    borderRadius: 32,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  item: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedItem: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: colors.primary,
  },
  glassClip: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 32,
    overflow: 'hidden',
  },
});
