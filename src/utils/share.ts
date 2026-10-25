import { api } from '../api/musicApi';
import type { Track } from '../types/music';

export async function shareTrackToStory(track: any) {
  if (!track) return;
  const url = `${window.location.origin}/track/${track.id}`;
  const title = track.title;
  const artist = track.artist?.name || '';
  const text = `${title} • ${artist} sur Mixify\n${url}`;

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      const files: File[] = [];
      if (navigator.canShare) {
        try {
          const coverUrl = track.album?.coverUrl || track.coverUrl;
          if (coverUrl) {
            const res = await fetch(coverUrl, { mode: 'cors' });
            if (res.ok) {
              const blob = await res.blob();
              const type = blob.type || 'image/jpeg';
              const ext = type.split('/')[1] || 'jpg';
              files.push(new File([blob], `mixify-${track.id}.${ext}`, { type }));
            }
          }
        } catch {}

        const shareData: any = { title, text, url };
        if (files.length > 0) shareData.files = files;
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      await navigator.share({ title, text, url });
      return;
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      alert('Lien copié');
    }
  } catch {}
}

/**
 * Lien WhatsApp pré-rempli avec le titre et le fichier audio : c'est ainsi que
 * la musique circule localement (le destinataire écoute sans installer l'app).
 * Si l'URL audio n'est pas disponible, on retombe sur le lien du site.
 */
export async function whatsAppShareLink(track: Track): Promise<string> {
  let target = window.location.origin;
  try {
    target = await api.getStreamUrl(track);
  } catch {
    /* flux introuvable : on partage au moins le lien de l'application */
  }
  const text = `${track.title} — ${track.artist.name} sur Mixify\n${target}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Ouvre WhatsApp (application sur mobile, web sinon) avec le partage prêt. */
export async function shareTrackToWhatsApp(track: Track): Promise<void> {
  const link = await whatsAppShareLink(track);
  window.open(link, '_blank', 'noopener,noreferrer');
}
