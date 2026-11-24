'use client';

import React, { useState } from 'react';
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ThermometerSnowflake,
  ThermometerSun,
  X,
} from 'lucide-react';
import { useMe } from '@/features/auth/hooks/useMe';
import { createOutfitPlan, createPackingPlan } from '@/features/planner/api/plannerApi';
import type { PackingPlanResponse } from '@/schemas/api/outfits';

interface PackingAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripScheduled?: (daysCount: number) => void | Promise<void>;
}

function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysIso(baseIso: string, offsetDays: number): string {
  const parts = baseIso.split('-').map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  const dt = new Date(year, month - 1, day + offsetDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function PackingAssistantModal({
  isOpen,
  onClose,
  onTripScheduled,
}: PackingAssistantModalProps): React.JSX.Element | null {
  const { data: me } = useMe();
  const [days, setDays] = useState<number>(3);
  const [weather, setWeather] = useState<'cold' | 'mild' | 'warm'>('mild');
  const [startDate, setStartDate] = useState<string>(() => getTodayIsoLocal());
  const [loading, setLoading] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PackingPlanResponse | null>(null);

  if (!isOpen) return null;

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const plan = await createPackingPlan({ days, weather });
      setResult(plan);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo generar la maleta. Asegúrate de tener prendas disponibles en tu armario.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleScheduleTrip() {
    if (!result || result.daily_plans.length === 0) return;
    setScheduling(true);
    setError(null);
    try {
      const userId = me?.user_id ?? 'default-user';
      for (const dayPlan of result.daily_plans) {
        if (dayPlan.garment_ids.length === 0) continue;
        await createOutfitPlan({
          user_id: userId,
          planned_date: addDaysIso(startDate, dayPlan.day - 1),
          garment_ids: dayPlan.garment_ids,
          occasion: 'Viaje',
          notes: `Viaje · Día ${dayPlan.day}: ${dayPlan.reason}`,
        });
      }
      const scheduledCount = result.daily_plans.filter(d => d.garment_ids.length > 0).length;
      await onTripScheduled?.(scheduledCount);
      setResult(null);
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'No pudimos agendar los días del viaje en tu calendario.'
      );
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-border bg-background p-6 shadow-xl">
        {/* Encabezado */}
        <div className="flex items-center justify-between border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Asistente de Maleta de Viaje</h3>
              <p className="text-xs text-muted-foreground">
                Optimiza el equipaje de tu viaje: máxima variedad con el mínimo de prendas.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        {/* Formulario de Configuración de Viaje */}
        {!result ? (
          <form onSubmit={handleGenerate} className="mt-6 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                ¿Cuántos días durará tu viaje?
              </label>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 7].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDays(d)}
                    className={`flex-1 rounded-xl border py-2.5 text-xs font-semibold transition ${
                      days === d
                        ? 'border-accent bg-accent text-accent-foreground shadow-2xs'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {d} días
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Clima predominante esperado
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setWeather('cold')}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    weather === 'cold'
                      ? 'border-accent bg-accent text-accent-foreground shadow-2xs'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <ThermometerSnowflake className="h-4 w-4" />
                  <span>Frío (Abrigo)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeather('mild')}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    weather === 'mild'
                      ? 'border-accent bg-accent text-accent-foreground shadow-2xs'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Templado</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWeather('warm')}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    weather === 'warm'
                      ? 'border-accent bg-accent text-accent-foreground shadow-2xs'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                >
                  <ThermometerSun className="h-4 w-4" />
                  <span>Cálido (Fresco)</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-xs font-bold text-accent-foreground shadow-sm hover:bg-accent/90 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  <span>Calculando cápsula de viaje...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Armar Maleta Minimalista</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Resultado de la Cápsula */
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  Cápsula de {result.days} días (
                  {result.weather === 'cold'
                    ? 'Clima frío'
                    : result.weather === 'warm'
                      ? 'Clima cálido'
                      : 'Clima templado'}
                  )
                </span>
                <span className="font-mono font-bold text-accent">
                  {result.total_items_count} prendas · {result.combinations_unlocked_count}{' '}
                  combinaciones
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{result.tip}</p>
            </div>

            {/* Prendas a empacar */}
            <div>
              <h4 className="text-xs font-bold text-foreground mb-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                Prendas esenciales a empacar en tu maleta:
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {result.packed_garments.map(g => (
                  <div
                    key={g.id}
                    className="overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                  >
                    <div className="aspect-square w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={g.processed_image_url}
                        alt={g.category}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-1.5 text-center">
                      <p className="truncate text-[10px] font-semibold text-foreground capitalize">
                        {g.category}
                      </p>
                      <p className="text-[9px] text-muted-foreground capitalize">
                        {g.position ?? 'prenda'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Plan diario */}
            <div>
              <h4 className="text-xs font-bold text-foreground mb-3">
                Propuesta de outfits por día:
              </h4>
              <div className="space-y-2">
                {result.daily_plans.map(p => (
                  <div
                    key={p.day}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 p-3 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                        {p.day}
                      </span>
                      <span className="text-foreground">{p.reason}</span>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {p.garment_ids.length} capas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Programar en calendario */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2">
              <label
                htmlFor="trip-start-date"
                className="block text-xs font-semibold text-foreground"
              >
                Fecha de inicio del viaje (para agendar en el calendario)
              </label>
              <input
                id="trip-start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                disabled={scheduling}
                className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                Ajustar parámetros
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={scheduling}
                className="rounded-full border border-border px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-60"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleScheduleTrip}
                disabled={scheduling || result.daily_plans.length === 0}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground shadow-xs hover:bg-accent/90 disabled:opacity-60"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>{scheduling ? 'Agendando días...' : 'Agendar viaje en el calendario'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
