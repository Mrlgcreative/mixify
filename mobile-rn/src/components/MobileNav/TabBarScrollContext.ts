import { createContext, type ComponentRef, type RefObject } from 'react';
import { View } from 'react-native';

export const TabBarScrollContext = createContext<{
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
} | null>(null);

export type TabBarBlurTarget = RefObject<ComponentRef<typeof View> | null>;

export const TabBarBlurTargetContext = createContext<
  ((target: TabBarBlurTarget) => void) | null
>(null);
