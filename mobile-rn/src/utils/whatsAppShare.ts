import { Platform } from 'react-native';

// URL de l'API backend (dérivée de l'URL de l'app, ou configurable)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.mixify.imasomo.com';

/**
 * Partage un titre audio vers WhatsApp (Story + Chat) via l'API backend.
 * Le token reste côté serveur — l'APP mobile n'y a jamais accès.
 */
export async function shareTrackToWhatsApp({
  audioUrl,
  title,
  artist,
  to,
  phoneNumberId,
}: {
  audioUrl: string;
  title: string;
  artist: string;
  to: string;
  phoneNumberId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUrl,
        title,
        artist,
        to,
        phoneNumberId,
        instanceId: process.env.EXPO_PUBLIC_WHATSAPP_INSTANCE_ID,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Échec de l\'envoi WhatsApp',
      };
    }

    return { success: true, error: undefined };
  } catch (error) {
    console.error('[whatsapp] share error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Impossible de contacter le serveur',
    };
  }
}
