import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, Music4, Upload } from 'lucide-react';

import { api, type PublishStage } from '../api/musicApi';
import { useConfirm } from '../components/common/ConfirmDialog';
import { ImageUpload } from '../components/common/ImageUpload';

const inputClass =
  'w-full rounded-card border border-line bg-elevated px-3 py-2.5 text-sm text-white placeholder:text-muted focus:border-primary focus:outline-none';

/** Publication d'un morceau : envoi vers R2 puis ajout au catalogue. */
export function Publish({ onPublished }: { onPublished?: () => void } = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [album, setAlbum] = useState('');
  const [cover, setCover] = useState('');
  const [bpm, setBpm] = useState('');
  const [year, setYear] = useState('');
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<PublishStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const ask = useConfirm();

  // Libère l'URL locale du fichier précédent (et au démontage).
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (next: File | null) => {
    setError(null);
    setDone(null);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : '');
    setDuration(0);
    setTitle(next ? next.name.replace(/\.[^.]+$/, '') : '');
  };

  const onFile = (next: File | null) => {
    if (next && next.type && !next.type.startsWith('audio/')) {
      setError('Choisis un fichier audio (mp3, wav, m4a, ogg, flac).');
      return;
    }
    choose(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    const ok = await ask({
      title: `Publier « ${title.trim() || file.name} » ?`,
      description: cover
        ? 'Le morceau et sa pochette seront ajoutés au catalogue public.'
        : 'Le morceau sera ajouté au catalogue public, sans pochette.',
      confirmLabel: 'Publier',
    });
    if (!ok) return;
    setBusy(true);
    setStage(null);
    setProgress(0);
    setError(null);
    setDone(null);
    try {
      const track = await api.uploadTrack(
        file,
        {
          title: title.trim(),
          album: album.trim() || undefined,
          bpm: bpm ? Number(bpm) : undefined,
          year: year ? Number(year) : undefined,
          duration: duration || undefined,
          coverUrl: cover || undefined,
        },
        setStage,
        setProgress,
      );
      choose(null);
      setAlbum('');
      setCover('');
      setBpm('');
      setYear('');
      setDone(
        `« ${track.title} » est publié : fichier contrôlé et ajouté aux nouveautés.`,
      );
      onPublished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publication impossible');
    } finally {
      setBusy(false);
      setStage(null);
      setProgress(0);
    }
  };

  return (
    <div className="px-4 py-6 md:px-6">
      <h2 className="text-3xl font-extrabold tracking-tight text-white">Publier un morceau</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Écoute le fichier ci-dessous avant de le mettre en ligne. Il est téléversé,
        contrôlé côté serveur (format et taille), puis rattaché à ton profil artiste.
      </p>

      <form onSubmit={submit} className="mt-6 flex max-w-xl flex-col gap-4">
        <label className="flex cursor-pointer items-center gap-3 rounded-panel border border-dashed border-line bg-card px-4 py-5 transition hover:border-primary">
          <Upload size={20} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white">
              {file ? file.name : 'Choisir un fichier audio'}
            </span>
            <span className="block text-xs text-muted">
              mp3, wav, m4a, ogg, flac, aac
            </span>
          </span>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.aac"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            className="sr-only"
          />
        </label>

        {preview && (
          <div className="rounded-panel bg-card p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
              <Music4 size={14} /> Écoute avant publication
            </p>
            <audio
              src={preview}
              controls
              preload="metadata"
              className="w-full"
              onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            />
          </div>
        )}

        <div className="flex items-center gap-4 rounded-panel bg-card p-3">
          <ImageUpload
            value={cover}
            onChange={setCover}
            folder="covers"
            size={96}
            label="Ajouter une pochette"
          />
          <div className="min-w-0 text-xs text-muted">
            <p className="text-sm font-medium text-white">Pochette du morceau</p>
            <p className="mt-1">JPG ou PNG, 5 Mo max. Sans image, un dégradé est généré.</p>
          </div>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Titre"
          aria-label="Titre"
          required
          className={inputClass}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={album}
            onChange={(event) => setAlbum(event.target.value)}
            placeholder="Album (optionnel)"
            aria-label="Album"
            className={inputClass}
          />
          <input
            type="number"
            min={1}
            max={300}
            value={bpm}
            onChange={(event) => setBpm(event.target.value)}
            placeholder="BPM (optionnel)"
            aria-label="BPM"
            className={inputClass}
          />
          <input
            type="number"
            min={1900}
            max={2100}
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Année (optionnel)"
            aria-label="Année"
            className={inputClass}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {done && <p className="text-sm text-primary">{done}</p>}

        <button
          type="submit"
          disabled={busy || !file || !title.trim()}
          className="flex items-center justify-center gap-2 self-start rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-black transition enabled:hover:scale-[1.01] disabled:opacity-40"
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {busy
            ? stage === 'check'
              ? 'Contrôle et publication…'
              : `Téléversement… ${progress} %`
            : 'Publier'}
        </button>

        {busy && (
          <div className="flex w-full max-w-sm items-center gap-3">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-elevated"
              role="progressbar"
              aria-label="Progression de la publication"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stage === 'check' ? 100 : progress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${stage === 'check' ? 100 : progress}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs tabular-nums text-muted">
              {stage === 'check' ? '100 %' : `${progress} %`}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}
