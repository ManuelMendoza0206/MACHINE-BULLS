import type { Metadata } from 'next';
import { SmartShoppingView } from '@/features/shopping/components/SmartShoppingView';

export const metadata: Metadata = {
  title: 'Antes de comprar | StyleMe',
  description:
    'Evalúa prendas de tienda antes de comprarlas para ver si ya tienes algo parecido en tu armario y qué combinaciones nuevas puedes armar.',
};

export default function SmartShoppingPage() {
  return <SmartShoppingView />;
}
