import { useRef, useState } from 'react';
import { Camera, Loader2, Upload } from 'lucide-react';
import { api } from '../../api/musicApi';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  shape?: 'square' | 'circle';
  className?: string;
  label?: string;
  size?: number;
}

export function ImageUpload({
  value,
  onChange,
  folder = 'images',
  shape = 'square',
  className = '',
  label = 'Téléverser une image',
  size = 128,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Seules les images sont acceptées');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 5MB)');
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const url = await api.uploadImage(file, folder);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`group relative flex items-center justify-center overflow-hidden border-2 border-dashed border-line bg-card transition hover:border-primary hover:bg-elevated ${
          shape === 'circle' ? 'rounded-full' : 'rounded-card'
        }`}
        style={{ width: size, height: size }}
        aria-label={label}
      >
        {value ? (
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted">
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
            <span className="text-xs">{uploading ? 'Envoi...' : 'Ajouter'}</span>
          </div>
        )}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100 ${
            uploading ? 'opacity-100' : ''
          }`}
        >
          {uploading ? (
            <Loader2 size={24} className="animate-spin text-white" />
          ) : (
            <Upload size={24} className="text-white" />
          )}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
