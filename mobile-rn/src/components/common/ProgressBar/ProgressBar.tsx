import Slider from '@react-native-community/slider';

import { colors } from '@/theme/theme';

interface ProgressBarProps {
  value: number;
  max: number;
  onChange?: (value: number) => void;
  /** Compacte la piste (barre du lecteur). */
  compact?: boolean;
}

/** Curseur de progression / volume, équivalent de `ProgressBar` web. */
export function ProgressBar({ value, max, onChange, compact }: ProgressBarProps) {
  return (
    <Slider
      style={{ width: '100%', height: compact ? 20 : 32 }}
      minimumValue={0}
      maximumValue={Math.max(max, 0.01)}
      value={Math.min(value, max)}
      onSlidingComplete={onChange}
      minimumTrackTintColor={colors.primary}
      maximumTrackTintColor={colors.line}
      thumbTintColor={onChange ? colors.primary : 'transparent'}
      disabled={!onChange}
    />
  );
}
