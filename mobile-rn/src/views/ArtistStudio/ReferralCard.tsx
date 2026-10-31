import * as Clipboard from 'expo-clipboard';
import { BadgeCheck, Check, Copy, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { T } from '@/components/common/T/T';
import { colors, PUBLIC_URL, radius } from '@/theme/theme';
import type { ArtistDashboard } from '@/types/music';

/** Parrainage : 3 filleuls certifient automatiquement le profil artiste. */
export function ReferralCard({
  referral,
  verified,
}: {
  referral: NonNullable<ArtistDashboard['referral']>;
  verified?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const link = `${PUBLIC_URL}/?ref=${encodeURIComponent(referral.code ?? '')}`;
  const remaining = Math.max(0, referral.required - referral.count);

  const copy = async () => {
    try {
      await Clipboard.setStringAsync(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible : le lien reste sélectionnable */
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Users size={17} color={colors.primary} />
        <T weight="bold" style={{ fontSize: 17 }}>
          Parrainage
        </T>
        {verified ? <BadgeCheck size={15} color={colors.primary} /> : null}
      </View>

      <T color={colors.muted} style={styles.text}>
        {verified
          ? 'Ton compte est certifié. Continue à inviter des personnes sur Mixify.'
          : remaining > 0
            ? `${referral.count} / ${referral.required} filleuls — invite ${remaining} personne${remaining > 1 ? 's' : ''} pour être certifié automatiquement.`
            : `${referral.count} / ${referral.required} filleuls — certification en cours.`}
      </T>

      <View style={styles.row}>
        <T selectable numberOfLines={1} style={styles.link} accessibilityLabel="Lien de parrainage">
          {link}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copier le lien de parrainage"
          onPress={() => void copy()}
          style={({ pressed }) => [styles.copy, pressed && { opacity: 0.85 }]}
        >
          {copied ? (
            <Check size={14} color={colors.primaryContrast} />
          ) : (
            <Copy size={14} color={colors.primaryContrast} />
          )}
          <T weight="bold" color={colors.primaryContrast} style={{ fontSize: 12 }}>
            {copied ? 'Copié' : 'Copier'}
          </T>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderRadius: radius.panel,
    backgroundColor: colors.card,
    padding: 18,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  text: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  link: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.card,
    backgroundColor: colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 11,
    color: colors.text,
  },
  copy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
});
