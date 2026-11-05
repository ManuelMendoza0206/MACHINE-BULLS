'use client';

import { useRef, useState, type DragEvent, type JSX } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface GarmentDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  /** @default true */
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

function toImageFiles(list: FileList | null): File[] {
  if (!list) return [];
  return Array.from(list).filter(f => f.type.startsWith('image/'));
}

/**
 * Drag&drop + click-to-select garment photo picker (wardrobe-flow/spec.md §2.4).
 * The whole control is the touch target — well above the 44×44px minimum.
 */
export function GarmentDropzone({
  onFilesSelected,
  multiple = true,
  disabled = false,
  className,
}: GarmentDropzoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const files = toImageFiles(e.dataTransfer.files);
    if (files.length > 0) onFilesSelected(multiple ? files : [files[0] as File]);
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={e => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={e => {
        e.preventDefault();
        if (!disabled) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'group relative flex min-h-32 md:min-h-[380px] lg:min-h-[440px] h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-border/80 bg-background/70 backdrop-blur-sm p-8 sm:p-12 text-center transition-all hover:border-accent/60 hover:bg-muted/30 shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
        isDragOver && 'border-accent bg-accent/10 shadow-md scale-[0.99]',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl bg-accent/10 text-accent transition-transform group-hover:scale-105 mb-1 shadow-2xs">
        <UploadCloud className="h-7 w-7 sm:h-8 sm:w-8 stroke-[1.75]" />
      </div>
      <p className="text-base sm:text-lg font-bold tracking-tight text-foreground">
        Arrastra tus prendas aquí
      </p>
      <p className="text-xs sm:text-sm text-muted-foreground max-w-xs leading-relaxed">
        o haz clic para elegir archivos desde tu dispositivo
      </p>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-[11px] font-mono text-muted-foreground border border-border/50">
        JPG, PNG, WEBP (múltiples fotos)
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        aria-label="Seleccionar fotos de prendas"
        onChange={e => {
          const files = toImageFiles(e.target.files);
          if (files.length > 0) onFilesSelected(files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
