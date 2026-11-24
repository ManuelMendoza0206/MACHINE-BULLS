export interface AestheticMeta {
  id: string;
  label: string;
  description: string;
}

export const AESTHETIC_CATALOG: Record<string, AestheticMeta> = {
  casual: {
    id: 'casual',
    label: 'Casual diario',
    description: 'Prendas cómodas y versátiles para todos los días.',
  },
  minimalist: {
    id: 'minimalist',
    label: 'Minimalista',
    description: 'Cortes limpios, paleta neutra y equilibrio visual.',
  },
  old_money: {
    id: 'old_money',
    label: 'Clásico / Old Money',
    description: 'Sastrería discreta, telas nobles y estilo atemporal.',
  },
  streetwear: {
    id: 'streetwear',
    label: 'Urbano / Streetwear',
    description: 'Siluetas amplias, capas relajadas y toque urbano.',
  },
  formal: {
    id: 'formal',
    label: 'Formal / Oficina',
    description: 'Conjuntos pulcros pensados para trabajo o reuniones.',
  },
  elegant: {
    id: 'elegant',
    label: 'Elegante',
    description: 'Combinaciones refinadas para eventos y salidas.',
  },
  sporty: {
    id: 'sporty',
    label: 'Deportivo',
    description: 'Comodidad funcional y estética atlética.',
  },
  gorpcore: {
    id: 'gorpcore',
    label: 'Outdoor / Gorpcore',
    description: 'Prendas técnicas, funcionales y resistentes.',
  },
  soft_boy: {
    id: 'soft_boy',
    label: 'Relajado y cálido',
    description: 'Tejidos suaves, capas ligeras y tonos amigables.',
  },
  starboy: {
    id: 'starboy',
    label: 'Nocturno / Audaz',
    description: 'Contrastes marcados, cuero o negro protagonista.',
  },
};

export function getAestheticMeta(id: string): AestheticMeta {
  const existing = AESTHETIC_CATALOG[id];
  if (existing) {
    return existing;
  }
  const formatted = id.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
  return {
    id,
    label: formatted,
    description: 'Estilo detectado en tu guardarropa.',
  };
}

/**
 * Estéticas reconocidas por el recomendador y el perfil de usuario.
 */
export const KNOWN_AESTHETICS: readonly string[] = Object.keys(AESTHETIC_CATALOG);
