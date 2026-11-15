'use client';

import React, { useEffect, useState, useTransition } from 'react';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Shirt,
  AlertCircle,
  WashingMachine,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import {
  confirmOutfitPlan,
  createOutfitPlan,
  deleteOutfitPlan,
  getOutfitPlans,
} from '@/features/planner/api/plannerApi';
import type { OutfitPlanResponse } from '@/schemas/api/outfits';
import type { GarmentSummary } from '@/schemas/api/garments';

function formatDateHeading(dateStr: string): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 2026;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
}

function getNext7Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const datePart = d.toISOString().split('T')[0] ?? '';
    dates.push(datePart);
  }
  return dates;
}

export function PlannerView(): React.JSX.Element {
  const [plans, setPlans] = useState<OutfitPlanResponse[]>([]);
  const [garments, setGarments] = useState<GarmentSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal para agendar nuevo plan
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(getNext7Days()[0] ?? '');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('Casual');
  const [selectedGarmentIds, setSelectedGarmentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');

  const [isPending, startTransition] = useTransition();

  const days = getNext7Days();
  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [fetchedPlans, capsuleRes] = await Promise.all([
        getOutfitPlans(),
        fetch('/api/v1/garments/capsule').then(r => (r.ok ? r.json() : { garments: [] })),
      ]);
      setPlans(fetchedPlans);
      setGarments(capsuleRes.garments || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar los planes.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenScheduleModal(dateStr: string) {
    setSelectedDate(dateStr);
    setSelectedGarmentIds([]);
    setNotes('');
    setIsModalOpen(true);
  }

  function toggleGarmentSelection(garmentId: string) {
    setSelectedGarmentIds(prev =>
      prev.includes(garmentId) ? prev.filter(id => id !== garmentId) : [...prev, garmentId]
    );
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (selectedGarmentIds.length === 0) {
      setError('Debes seleccionar al menos una prenda para el conjunto.');
      return;
    }

    try {
      await createOutfitPlan({
        user_id: 'default-user',
        planned_date: selectedDate,
        garment_ids: selectedGarmentIds,
        occasion: selectedOccasion,
        notes: notes || undefined,
      });
      setIsModalOpen(false);
      setSuccessMessage('¡Conjunto agendado con éxito!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el plan.');
    }
  }

  async function handleConfirmUsage(planId: string, sendToLaundry: boolean) {
    startTransition(async () => {
      try {
        await confirmOutfitPlan(planId, sendToLaundry);
        setSuccessMessage(
          sendToLaundry
            ? '¡Uso confirmado! Las prendas se movieron a lavandería.'
            : '¡Uso confirmado con éxito!'
        );
        setTimeout(() => setSuccessMessage(null), 3500);
        await loadData();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al confirmar uso.');
      }
    });
  }

  async function handleDeletePlan(planId: string) {
    if (!window.confirm('¿Quieres cancelar este conjunto agendado?')) return;
    try {
      await deleteOutfitPlan(planId);
      setSuccessMessage('Plan cancelado.');
      setTimeout(() => setSuccessMessage(null), 2500);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cancelar plan.');
    }
  }

  const garmentMap = new Map<string, GarmentSummary>(garments.map(g => [g.id, g]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <PageHeader
        title="Planificador de vestimenta"
        description="Organiza tus conjuntos de la semana con anticipación y confirma cuándo los usas."
      />

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Clock className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm">Cargando tu agenda de vestimenta...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-accent" />
              Próximos 7 días
            </h2>
            <button
              onClick={() => handleOpenScheduleModal(todayStr)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground shadow-xs transition hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              Agendar conjunto
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {days.map(dateStr => {
              const dayPlans = plans.filter(p => p.planned_date === dateStr);
              const isToday = dateStr === todayStr;

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                    isToday
                      ? 'border-accent/40 bg-accent/5 shadow-xs'
                      : 'border-border/60 bg-card hover:border-border'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/40">
                      <div>
                        <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                          {isToday ? 'Hoy • ' : ''}
                          {formatDateHeading(dateStr)}
                        </span>
                        <p className="text-xs text-muted-foreground/80 font-mono mt-0.5">
                          {dateStr}
                        </p>
                      </div>
                      {dayPlans.length > 0 && (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            dayPlans[0]?.status === 'COMPLETED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-accent/15 text-accent font-semibold'
                          }`}
                        >
                          {dayPlans[0]?.status === 'COMPLETED' ? 'Usado' : 'Planificado'}
                        </span>
                      )}
                    </div>

                    {dayPlans.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                        <Shirt className="h-8 w-8 stroke-1 text-muted-foreground/40 mb-2" />
                        <p className="text-xs">Sin conjunto programado</p>
                        <button
                          onClick={() => handleOpenScheduleModal(dateStr)}
                          className="mt-3 inline-flex items-center gap-1.5 text-xs text-accent hover:underline font-medium"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Programar día
                        </button>
                      </div>
                    ) : (
                      dayPlans.map(plan => (
                        <div key={plan.id} className="py-3">
                          {plan.occasion && (
                            <span className="inline-block rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground mb-2">
                              {plan.occasion}
                            </span>
                          )}
                          {plan.notes && (
                            <p className="text-xs text-muted-foreground mb-2 italic">
                              &quot;{plan.notes}&quot;
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2 my-2">
                            {plan.garment_ids.map(gId => {
                              const g = garmentMap.get(gId);
                              return (
                                <div
                                  key={gId}
                                  className="group relative h-16 w-16 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                                >
                                  {g?.processed_image_url ? (
                                    <>
                                      {/* eslint-disable-next-line @next/next/no-img-element -- garment image URLs come from Azure/local dynamic hosts */}
                                      <img
                                        src={g.processed_image_url}
                                        alt={g.category}
                                        className="h-full w-full object-cover"
                                      />
                                    </>
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                                      {g?.category || 'Prenda'}
                                    </div>
                                  )}
                                  <span className="absolute bottom-0 inset-x-0 bg-background/80 text-[9px] text-center truncate py-0.5 backdrop-blur-xs">
                                    {g?.position || g?.category || 'prenda'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="mt-4 pt-3 border-t border-border/40 flex flex-col gap-2">
                            {plan.status !== 'COMPLETED' ? (
                              <>
                                <button
                                  onClick={() => handleConfirmUsage(plan.id, true)}
                                  disabled={isPending}
                                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition"
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                  Usar hoy y enviar a lavar
                                </button>
                                <button
                                  onClick={() => handleConfirmUsage(plan.id, false)}
                                  disabled={isPending}
                                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/80 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition"
                                >
                                  Solo registrar uso
                                </button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-4 w-4" />
                                Uso confirmado en tus estadísticas
                              </div>
                            )}

                            <button
                              onClick={() => handleDeletePlan(plan.id)}
                              className="inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground/80 hover:text-destructive transition mt-1"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Cancelar plan
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal para agendar conjunto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl">
            <h3 className="text-base font-bold text-foreground mb-1">
              Agendar conjunto para el guardarropa
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Selecciona las prendas y la ocasión prevista para planificar tu atuendo.
            </p>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Fecha asignada
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Ocasión</label>
                <select
                  value={selectedOccasion}
                  onChange={e => setSelectedOccasion(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
                >
                  <option value="Casual">Casual / Diario</option>
                  <option value="Trabajo">Trabajo / Oficina</option>
                  <option value="Universidad">Universidad / Clases</option>
                  <option value="Formal">Formal / Evento</option>
                  <option value="Fiesta">Fiesta / Noche</option>
                  <option value="Deporte">Deporte / Aire libre</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Elige las prendas del conjunto ({selectedGarmentIds.length} seleccionadas)
                </label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border/60 p-2 grid grid-cols-4 gap-2 bg-muted/20">
                  {garments.map(g => {
                    const isSelected = selectedGarmentIds.includes(g.id);
                    const isLaundry = g.status === 'LAUNDRY';

                    return (
                      <button
                        type="button"
                        key={g.id}
                        disabled={isLaundry}
                        onClick={() => toggleGarmentSelection(g.id)}
                        className={`relative rounded-xl border p-1 text-left transition-all ${
                          isSelected
                            ? 'border-accent bg-accent/15 ring-2 ring-accent'
                            : isLaundry
                              ? 'opacity-40 border-dashed border-border/80 cursor-not-allowed'
                              : 'border-border/60 hover:border-border'
                        }`}
                      >
                        <div className="h-14 w-full overflow-hidden rounded-lg bg-background">
                          {/* eslint-disable-next-line @next/next/no-img-element -- garment image URLs come from Azure/local dynamic hosts */}
                          <img
                            src={g.processed_image_url}
                            alt={g.category}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <p className="text-[10px] truncate text-center mt-1 text-foreground">
                          {g.category}
                        </p>
                        {isLaundry && (
                          <span className="absolute top-1 right-1 rounded-full bg-amber-500/80 p-0.5 text-white">
                            <WashingMachine className="h-2.5 w-2.5" />
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1 right-1 rounded-full bg-accent p-0.5 text-accent-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Notas adicionales (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej: Si llueve llevar paraguas"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-border/80 px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 transition shadow-xs"
                >
                  Guardar plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
