import { useRef, useState } from 'react';
import { Camera, Pencil, Trash2 } from 'lucide-react';

// Where a profile photo goes: drop a picture on it or click to choose one. The small tile shows the current
// photo, and a bin removes it.
export default function PhotoDropZone({
  photo,
  error,
  onFile,
  onRemove,
  compact = false,
}: {
  photo: string | null;
  error?: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const choose = () => input.current?.click();

  if (compact) {
    return (
      <div className="shrink-0 p-1">
        <button
          type="button"
          aria-label={photo ? 'Edit your photo' : 'Add a photo'}
          onClick={choose}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) onFile(f);
          }}
          className={`group relative h-20 w-20 cursor-pointer rounded-full transition-transform hover:scale-[1.02] ${over ? 'scale-[1.02]' : ''}`}
        >
          <span className={`flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface text-muted ring-4 transition-colors ${over ? 'ring-accent' : 'ring-accent/30'}`}>
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" draggable={false} /> : <Camera className="h-7 w-7" />}
          </span>
          <span className="absolute right-0 bottom-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-accent text-canvas transition-transform group-hover:scale-110">
            <Pencil className="h-3.5 w-3.5" />
          </span>
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
        {error && <p className="mt-2 font-support text-xs text-red-300">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label={photo ? 'Replace your photo' : 'Add a photo'}
        onClick={choose}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            choose();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const f = e.dataTransfer.files[0];
          if (f) onFile(f);
        }}
        className={`flex w-full max-w-xl cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-3 transition-colors ${
          over ? 'border-accent bg-accent-soft' : 'border-line hover:border-muted'
        }`}
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface text-muted">
          {photo ? <img src={photo} alt="" className="h-full w-full object-cover" draggable={false} /> : <Camera className="h-6 w-6" />}
        </span>
        <span className="min-w-0 flex-1 font-support text-xs text-muted">
          <span className="block text-sm font-medium text-ink">{photo ? 'Drop a new photo here' : 'Drop a photo here'}</span>
          {photo ? 'or click to replace it' : 'or click to choose one'}
        </span>
        {photo && (
          <button
            type="button"
            aria-label="Remove photo"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="cursor-pointer p-2 text-muted transition-colors hover:text-ink"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-2 font-support text-xs text-red-300">{error}</p>}
    </div>
  );
}
