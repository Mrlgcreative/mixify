import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { request } from '../api/musicApi';

/** Données publiques renvoyées par `GET /api/tracks/:id`. */
interface ShareTrack {
  title: string;
  artiste: string | null;
  album: string | null;
  cover_url: string | null;
  audio_url: string | null;
}

/** Page publique d'un morceau partagé (`/track/:id`), lisible sans compte. */
export function TrackShareView({ id }: { id: string }) {
  const [track, setTrack] = useState<ShareTrack | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    request<{ track: ShareTrack }>(`/api/tracks/${encodeURIComponent(id)}`)
      .then((res) => alive && setTrack(res.track))
      .catch(() => alive && setMissing(true));
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg p-6 text-white">
      <a href="/" className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
        Mixify
      </a>

      {missing ? (
        <p className="text-muted">Ce morceau n’est plus disponible.</p>
      ) : !track ? (
        <Loader2 size={20} className="animate-spin text-muted" />
      ) : (
        <article className="flex w-full max-w-sm flex-col items-center gap-5">
          {/* Carte générique « Mixify » à la place de la pochette. */}
          <div className="flex aspect-square w-full items-center justify-center rounded-panel bg-elevated text-6xl text-primary shadow-card">
            M
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-bold">{track.title}</h1>
            <p className="mt-1 text-subtle">{track.artiste ?? 'Artiste Mixify'}</p>
            {track.album ? <p className="mt-0.5 text-sm text-muted">{track.album}</p> : null}
          </div>

          {track.audio_url ? (
            <audio className="w-full" controls autoPlay preload="metadata" src={track.audio_url} />
          ) : (
            <p className="text-sm text-muted">Aucun fichier audio disponible.</p>
          )}

          <a href="/" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-contrast">
            Écouter sur Mixify
          </a>
        </article>
      )}
    </main>
  );
}
