import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';

// Where a profile photo goes: drop a picture on it or click to choose one. The small tile shows the current
// photo, and a bin removes it.
export default function PhotoDropZone({
  photo,
  error,
  onFile,
  onRemove,
}: {
  photo: string | null;
  error?: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const choose = () => input.current?.click();

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
