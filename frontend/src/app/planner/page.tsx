import type { JSX } from 'react';
import { PlannerView } from '@/features/planner/components/PlannerView';

export const metadata = {
  title: 'Planificador de vestimenta | StyleMe',
  description: 'Organiza tus conjuntos de la semana con anticipación y confirma cuándo los usas.',
};

export default function PlannerPage(): JSX.Element {
  return <PlannerView />;
}
