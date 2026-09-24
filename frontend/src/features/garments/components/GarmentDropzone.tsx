'use client';

import { useRef, useState, type DragEvent, type JSX } from 'react';
import { cn } from '@/lib/utils/cn';

export interface GarmentDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  /** @default true */
  multiple?: boolean;
  disabled?: boolean;
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
        'flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 text-center transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isDragOver && 'border-accent bg-muted',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <p className="text-sm font-medium">Arrastrá tus prendas aquí</p>
      <p className="text-xs text-muted-foreground">o hacé click para elegir archivos</p>
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
