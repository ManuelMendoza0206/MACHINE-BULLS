import {
  Calendar,
  Camera,
  Shirt,
  ShoppingBag,
  Sparkles,
  User,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: '/wardrobe' | '/outfits' | '/planner' | '/shopping' | '/try-on' | '/profile';
  label: string;
  icon: LucideIcon;
}

/**
 * Secciones principales de la plataforma StyleMe:
 * Armario, Outfits, Planificar, Compras inteligentes, Probador virtual y Perfil.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/wardrobe', label: 'Armario', icon: Shirt },
  { href: '/outfits', label: 'Outfits', icon: Sparkles },
  { href: '/planner', label: 'Planificar', icon: Calendar },
  { href: '/shopping', label: 'Compras', icon: ShoppingBag },
  { href: '/try-on', label: 'Probador', icon: Camera },
  { href: '/profile', label: 'Perfil', icon: User },
];
