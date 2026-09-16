import { Camera, Shirt, Sparkles, User, type LucideIcon } from 'lucide-react';

export interface NavItem {
  href: '/wardrobe' | '/outfits' | '/try-on' | '/profile';
  label: string;
  icon: LucideIcon;
}

/**
 * Exactly 4 root sections — fixed by frontend-plan.md §2.1. Adding a 5th needs that
 * decision updated first (app-shell/spec.md, "Navegación adaptativa").
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/wardrobe', label: 'Armario', icon: Shirt },
  { href: '/outfits', label: 'Outfits', icon: Sparkles },
  { href: '/try-on', label: 'Probador', icon: Camera },
  { href: '/profile', label: 'Perfil', icon: User },
];
