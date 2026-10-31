import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fontScale, fonts } from '@/theme/theme';

export type Weight = keyof typeof fonts;

interface TProps extends TextProps {
  weight?: Weight;
  color?: string;
}

/** Texte avec la police Inter du thème, agrandie à l'échelle de l'app. */
export function T({ weight = 'regular', color = colors.text, style, ...rest }: TProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const scaled =
    typeof flat.fontSize === 'number'
      ? {
          fontSize: flat.fontSize * fontScale,
          ...(typeof flat.lineHeight === 'number'
            ? { lineHeight: flat.lineHeight * fontScale }
            : {}),
        }
      : {};

  return <Text {...rest} style={[{ fontFamily: fonts[weight], color }, flat, scaled]} />;
}
