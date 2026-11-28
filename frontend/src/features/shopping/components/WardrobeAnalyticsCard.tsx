'use client';

import type { JSX } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { fetchWardrobeAnalytics } from '../api/fetchWardrobeAnalytics';
import { BentoCard } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, AlertCircle, ShoppingBag, ArrowRight } from 'lucide-react';

export function WardrobeAnalyticsCard(): JSX.Element {
  const router = useRouter();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['wardrobe', 'analytics'],
    queryFn: ({ signal }) => fetchWardrobeAnalytics(signal),
    staleTime: 1000 * 60 * 5, // 5 min
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 shadow-sm space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full" />
      </BentoCard>
    );
  }

  if (!analytics || analytics.total_garments === 0) {
    return (
      <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <BarChart3 className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold tracking-tight">Uso de tu guardarropa</h2>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Sube tus primeras prendas para ver qué tanto usas tu ropa y qué piezas básicas te faltan.
        </p>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="p-6 rounded-3xl border-border/80 bg-background/85 shadow-sm justify-between space-y-5">
      <div className="space-y-4">
        {/* Encabezado */}
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <BarChart3 className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold tracking-tight">Uso de tu guardarropa</h2>
          </div>
          <Badge variant="outline" className="text-accent border-accent/30 font-mono text-xs">
            {analytics.total_garments} prendas
          </Badge>
        </div>

        {/* Tasa de Utilización */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Prendas con registro de uso</span>
            <span className="font-semibold text-accent font-mono">
              {analytics.utilization_rate}%
            </span>
          </div>
          <Progress value={analytics.utilization_rate} className="h-2 rounded-full" />
          <p className="text-[10px] text-muted-foreground">
            Porcentaje de tu guardarropa registrado al menos una vez
          </p>
        </div>

        {/* Prendas sugeridas (Wardrobe Gaps) */}
        {analytics.wardrobe_gaps.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-accent" />
              Prendas sugeridas para tu armario:
            </span>
            <ul className="space-y-1.5">
              {analytics.wardrobe_gaps.map((gap, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-xl border border-border/40 flex items-start gap-2"
                >
                  <span className="text-accent font-bold">•</span>
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prendas más usadas */}
        {analytics.most_worn_garments.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-foreground">
              Tus piezas favoritas (más combinadas):
            </span>
            <div className="flex gap-2">
              {analytics.most_worn_garments.map(g => (
                <div
                  key={g.id}
                  className="relative aspect-square w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border/60"
                  title={`${g.category} - ${g.wear_count} usos`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.image_url} alt={g.category} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 bg-accent text-accent-foreground text-[9px] font-mono px-1 rounded-tl-md">
                    {g.wear_count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prendas olvidadas / sin uso reciente */}
        {analytics.unworn_garments && analytics.unworn_garments.length > 0 && (
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Prendas olvidadas (sin registro de uso):
            </span>
            <div className="flex gap-2">
              {analytics.unworn_garments.slice(0, 4).map(g => (
                <div
                  key={g.id}
                  className="relative aspect-square w-12 h-12 rounded-xl overflow-hidden bg-muted/60 border border-dashed border-border/80 opacity-75 hover:opacity-100 transition-opacity"
                  title={`${g.category} - 0 usos registrados`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.image_url}
                    alt={g.category}
                    className="w-full h-full object-cover grayscale"
                  />
                  <span className="absolute bottom-0 right-0 bg-muted-foreground/80 text-background text-[9px] font-mono px-1 rounded-tl-md">
                    0x
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Considera probarlas en nuevas combinaciones o donarlas si no las usas.
            </p>
          </div>
        )}
      </div>

      {/* Acceso a Smart Shopping */}
      <div className="pt-4 border-t border-border/60">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs rounded-full h-9 gap-1.5"
          onClick={() => router.push('/shopping')}
        >
          <ShoppingBag className="h-3.5 w-3.5 text-accent" />
          <span>Evaluar antes de comprar</span>
          <ArrowRight className="h-3.5 w-3.5 ml-auto" />
        </Button>
      </div>
    </BentoCard>
  );
}
