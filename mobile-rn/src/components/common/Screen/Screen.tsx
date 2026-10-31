import { BlurTargetView } from 'expo-blur';
import { useIsFocused } from 'expo-router';
import {
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ComponentRef,
  type ReactNode,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
} from 'react-native';

import {
  TabBarBlurTargetContext,
  TabBarScrollContext,
} from '@/components/MobileNav/TabBarScrollContext';
import { colors } from '@/theme/theme';

interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
  /** Padding bas : laisse la place au mini-lecteur et à la barre d'onglets. */
  bottomSpace?: number;
}

/** Conteneur défilant commun : marges, rafraîchissement, fond transparent. */
export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
  bottomSpace = 180,
}: ScreenProps) {
  const tabBarScrollState = useContext(TabBarScrollContext);
  const tabBarBlurTarget = useContext(TabBarBlurTargetContext);
  const isFocused = useIsFocused();
  const dragAnchorOffset = useRef(0);
  const isDragging = useRef(false);
  const screenBlurTarget = useRef<ComponentRef<typeof View> | null>(null);

  useEffect(() => {
    if (isFocused && tabBarBlurTarget) {
      tabBarBlurTarget(screenBlurTarget);
    }
  }, [isFocused, tabBarBlurTarget]);

  const handleScrollBeginDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      dragAnchorOffset.current = event.nativeEvent.contentOffset.y;
      isDragging.current = true;
    },
    [],
  );
  const handleScrollEndDrag = useCallback(() => {
    isDragging.current = false;
  }, []);
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isDragging.current || !tabBarScrollState) return;

      const offset = event.nativeEvent.contentOffset.y;
      const deltaFromAnchor = offset - dragAnchorOffset.current;

      if (deltaFromAnchor >= 24) {
        // Vers le bas : la capsule se replie, le mini-lecteur vient dans la barre.
        tabBarScrollState.setCollapsed(true);
        dragAnchorOffset.current = offset;
      } else if (deltaFromAnchor <= -20) {
        // Vers le haut : tout se redéploie, comme sur iOS 26.
        tabBarScrollState.setCollapsed(false);
        dragAnchorOffset.current = offset;
      }

    },
    [tabBarScrollState],
  );

  return (
    <BlurTargetView ref={screenBlurTarget} style={styles.target}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          { paddingHorizontal: 16, paddingTop: 4, paddingBottom: bottomSpace },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        scrollEventThrottle={32}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(refreshing)}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.card}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  target: { flex: 1 },
  scroll: { flex: 1, backgroundColor: 'transparent' },
});
