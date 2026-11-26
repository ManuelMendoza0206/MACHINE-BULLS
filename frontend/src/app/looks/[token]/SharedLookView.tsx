'use client';

import { useState, type JSX } from 'react';
import Link from 'next/link';
import { Download, ImageOff, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getSharedLookImageUrl } from '@/features/vton/api/shareVtonJob';

export function SharedLookView({ token }: { token: string }): JSX.Element {
  const imageUrl = getSharedLookImageUrl(token);
  const [imageFailed, setImageFailed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDownload = async (): Promise<void> => {
    setIsDownloading(true);
    setMessage(null);
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`shared look download failed with ${String(response.status)}`);
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'styleme-look.jpg';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
    } catch {
      setMessage('No pudimos descargar la imagen. El enlace puede haber expirado.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7 overflow-hidden rounded-3xl border border-border/80 bg-muted/20 p-3 shadow-sm">
          {imageFailed ? (
            <div className="flex aspect-3/4 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-background/60 px-6 text-center">
              <ImageOff className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Este look ya no está disponible</p>
              <p className="text-xs text-muted-foreground">
                Los enlaces de compartir expiran a las 24 horas.
              </p>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- imagen servida por el backend
            <img
              src={imageUrl}
              alt="Look generado con StyleMe"
              className="aspect-3/4 w-full rounded-2xl object-cover"
              onError={() => setImageFailed(true)}
            />
          )}
        </Card>

        <Card className="lg:col-span-5 rounded-3xl border border-border/80 bg-background/85 p-6 sm:p-7 shadow-sm">
          <Badge
            variant="outline"
            className="border-accent/40 text-accent font-mono text-[10px] gap-1"
          >
            <Sparkles className="h-3 w-3" />
            Look compartido
          </Badge>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Un look para inspirarte
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta combinación se generó con StyleMe a partir de un armario real y una prueba virtual
            sobre foto corporal.
          </p>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              className="w-full"
              onClick={() => void handleDownload()}
              disabled={imageFailed || isDownloading}
            >
              <Download className="h-4 w-4" />
              {isDownloading ? 'Descargando…' : 'Descargar imagen'}
            </Button>
            <Button type="button" variant="secondary" className="w-full" asChild>
              <Link href="/">Crear mi propio look</Link>
            </Button>
          </div>

          {message && (
            <p role="alert" className="mt-4 text-xs font-medium text-destructive">
              {message}
            </p>
          )}

          <p className="mt-6 border-t border-border/60 pt-4 text-[11px] leading-relaxed text-muted-foreground">
            El enlace expira 24 horas después de compartirse. La foto original del usuario no se
            expone en esta página.
          </p>
        </Card>
      </div>
    </main>
  );
}
