'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Paintbrush, RotateCcw, X, Check } from 'lucide-react';

interface GarmentMaskEditorModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (adjustedDataUrl: string) => void;
}

export function GarmentMaskEditorModal({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}: GarmentMaskEditorModalProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<'eraser' | 'brush'>('eraser');
  const [brushSize, setBrushSize] = useState<number>(20);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;
      resetCanvas();
    };
    img.src = imageUrl;
  }, [isOpen, imageUrl]);

  function resetCanvas() {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth || 500;
    canvas.height = img.naturalHeight || 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  }

  function getCoords(e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(e: React.MouseEvent<HTMLCanvasElement>) {
    setIsDrawing(true);
    draw(e);
  }

  function stopDrawing() {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.beginPath();
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoords(e);

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-border bg-background p-6 shadow-2xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 className="text-sm font-bold text-foreground">Ajustar bordes de recorte</h3>
            <p className="text-[11px] text-muted-foreground">
              Usa el borrador para eliminar restos de fondo no deseados.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Cerrar editor"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Barra de herramientas */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 py-3 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                tool === 'eraser'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Borrador</span>
            </button>
            <button
              type="button"
              onClick={() => setTool('brush')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition ${
                tool === 'brush'
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              <Paintbrush className="h-3.5 w-3.5" />
              <span>Pincel blanco</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Tamaño:</span>
            <input
              type="range"
              min={5}
              max={60}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="h-1.5 w-20 accent-accent cursor-pointer"
            />
            <span className="font-mono text-[10px] text-muted-foreground">{brushSize}px</span>
          </div>

          <button
            type="button"
            onClick={resetCanvas}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            title="Revertir cambios"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Revertir</span>
          </button>
        </div>

        {/* Área del lienzo Canvas */}
        <div className="my-4 flex flex-1 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/80 bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[size:16px_16px] p-2">
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseUp={stopDrawing}
            onMouseMove={draw}
            onMouseLeave={stopDrawing}
            className="max-h-[50vh] max-w-full cursor-crosshair rounded-lg object-contain shadow-xs"
          />
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-foreground hover:bg-accent/90 transition shadow-xs"
          >
            <Check className="h-4 w-4" />
            <span>Aplicar recorte ajustado</span>
          </button>
        </div>
      </div>
    </div>
  );
}
