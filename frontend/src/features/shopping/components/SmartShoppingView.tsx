'use client';

import { useState, useRef, type JSX, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Check,
  Loader2,
  Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { evaluateCandidateGarment } from '../api/evaluateCandidateGarment';
import { adoptCandidateGarment } from '../api/adoptCandidateGarment';
import type { SmartShoppingEvaluateResponse } from '@/schemas/api/shopping';

export function SmartShoppingView(): JSX.Element {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SmartShoppingEvaluateResponse | null>(null);
  const [isAdopted, setIsAdopted] = useState<boolean>(false);
  const [isAdopting, setIsAdopting] = useState<boolean>(false);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setEvaluation(null);
    setIsAdopted(false);

    try {
      const res = await evaluateCandidateGarment(file);
      setEvaluation(res);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al analizar la prenda. Intenta con otra imagen.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdopt = async () => {
    if (!evaluation) return;
    setIsAdopting(true);
    try {
      await adoptCandidateGarment(evaluation.candidate_garment.garment_id);
      setIsAdopted(true);
    } catch {
      setError('No se pudo añadir la prenda al armario. Intenta de nuevo.');
    } finally {
      setIsAdopting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-accent border-accent/30 text-xs">
              Antes de comprar
            </Badge>
            <span className="text-xs text-muted-foreground">Decisiones inteligentes</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Asistente de compra
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Sube una foto de la prenda que estás pensando comprar. Te decimos si ya tienes algo
            parecido en tu armario y cuántas combinaciones nuevas puedes armar con ella.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="rounded-full shadow-xs gap-2 shrink-0"
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          <span>{evaluation ? 'Analizar otra prenda' : 'Subir foto de tienda'}</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Zona de Drop / Carga inicial */}
      {!evaluation && !isLoading && (
        <Card
          onClick={() => fileInputRef.current?.click()}
          className="border-dashed border-2 border-border/80 hover:border-accent/60 transition-all cursor-pointer p-12 text-center flex flex-col items-center justify-center gap-4 bg-muted/20"
        >
          <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <ShoppingBag className="h-8 w-8" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-foreground">
              Haz clic para seleccionar o arrastra la foto de la prenda
            </h3>
            <p className="text-xs text-muted-foreground max-w-md">
              Soporta fotos tomadas en el probador de la tienda, capturas de pantalla de Zara,
              Shein, H&M o tiendas online.
            </p>
          </div>
          <Button type="button" size="sm" className="rounded-full mt-2 pointer-events-none">
            Elegir imagen
          </Button>
        </Card>
      )}

      {/* Estado de carga */}
      {isLoading && (
        <Card className="p-12 text-center flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 text-accent animate-spin" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              Analizando compatibilidad con tu guardarropa...
            </h3>
            <p className="text-xs text-muted-foreground">
              Analizando la prenda, buscando combinaciones con tu armario y comprobando si ya tienes
              algo similar.
            </p>
          </div>
        </Card>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados del análisis */}
      {evaluation && (
        <div className="space-y-8">
          {/* Tarjeta de dictamen principal */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Foto de la prenda candidata */}
            <Card className="p-6 flex flex-col items-center justify-between text-center gap-4 md:col-span-1">
              <div className="w-full">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-2 font-medium">
                  Prenda que quieres comprar
                </span>
                <div className="aspect-square w-full rounded-2xl overflow-hidden bg-muted/40 border border-border/50 relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={evaluation.candidate_garment.processed_image_url}
                    alt={evaluation.candidate_garment.category}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold capitalize text-foreground">
                  {evaluation.candidate_garment.category}
                </h3>
                <p className="text-xs text-muted-foreground capitalize">
                  Estética {evaluation.candidate_garment.top_aesthetics?.[0]?.aesthetic ?? 'casual'}
                </p>
              </div>

              <Button
                type="button"
                onClick={handleAdopt}
                disabled={isAdopted || isAdopting}
                className="w-full rounded-full gap-2"
                variant={isAdopted ? 'secondary' : 'default'}
              >
                {isAdopted ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span>En tu armario</span>
                  </>
                ) : isAdopting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Agregar a mi armario</span>
                  </>
                )}
              </Button>
            </Card>

            {/* Diagnóstico y Métricas */}
            <div className="md:col-span-2 space-y-6">
              {/* Alerta de Redundancia */}
              <Card
                className={`p-6 border ${
                  evaluation.redundancy.is_redundant
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-emerald-500/40 bg-emerald-500/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  {evaluation.redundancy.is_redundant ? (
                    <AlertTriangle
                      className="h-6 w-6 text-amber-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2
                      className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-1">
                    <h4 className="font-bold text-foreground">
                      {evaluation.redundancy.is_redundant
                        ? 'Ya tienes una prenda muy parecida'
                        : 'Es una prenda nueva para tu guardarropa'}
                    </h4>
                    <p className="text-xs text-muted-foreground">{evaluation.redundancy.message}</p>
                  </div>
                </div>
              </Card>

              {/* Dictamen y Métricas de Utilidad */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Layers className="h-4 w-4 text-accent" aria-hidden="true" />
                    <span>Prendas compatibles</span>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {evaluation.compatible_garments_count}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Prendas de tu armario que combinan bien con ella
                  </p>
                </Card>

                <Card className="p-4 space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Sparkles className="h-4 w-4 text-accent" aria-hidden="true" />
                    <span>Combinaciones posibles</span>
                  </div>
                  <div className="text-2xl font-black text-foreground">
                    {evaluation.potential_outfits_count}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Combinaciones de estilo listas para usar
                  </p>
                </Card>
              </div>

              {/* Veredicto de compra */}
              <Card className="p-5 bg-accent/5 border-accent/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-accent text-accent font-semibold text-xs"
                  >
                    Recomendación
                  </Badge>
                </div>
                <p className="text-sm font-medium text-foreground">{evaluation.verdict}</p>
              </Card>
            </div>
          </div>

          {/* Outfits Potenciales */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Nuevas combinaciones que puedes armar ({evaluation.potential_outfits.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Puedes probarte cualquiera de estas combinaciones con tu propia foto en el
                  probador virtual.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {evaluation.potential_outfits.map(outfit => (
                <Card
                  key={outfit.outfit_id}
                  className="p-5 flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm capitalize text-foreground">
                        {outfit.aesthetic.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className="text-xs font-mono">
                        {outfit.garments.length} prendas
                      </Badge>
                    </div>

                    {outfit.reason && (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                        {outfit.reason}
                      </p>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Armonía cromática</span>
                        <span className="font-semibold text-accent">
                          {Math.round(outfit.chromatic_score * 100)}%
                        </span>
                      </div>
                      <Progress
                        value={Math.round(outfit.chromatic_score * 100)}
                        className="h-1.5 rounded-full"
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-border/60">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => router.push(`/try-on?outfit_id=${outfit.outfit_id}`)}
                      className="w-full rounded-full gap-2 text-xs"
                    >
                      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Probar en el probador</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
