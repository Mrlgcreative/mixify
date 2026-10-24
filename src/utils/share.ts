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
