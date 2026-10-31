import { Alert } from 'react-native';

/** Confirmation native, équivalent de `useConfirm` sur le web. */
export function confirm(
  title: string,
  message: string,
  confirmLabel = 'Confirmer',
  danger = false,
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: danger ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/** Notification native légère. */
export function notify(title: string, message?: string): void {
  Alert.alert(title, message);
}
