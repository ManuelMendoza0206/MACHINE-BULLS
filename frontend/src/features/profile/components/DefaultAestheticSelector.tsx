import type { JSX } from 'react';
import { cn } from '@/lib/utils/cn';

export interface DefaultAestheticSelectorProps {
  value: string | null;
  onChange: (aesthetic: string | null) => void;
  availableAesthetics: string[];
}

const NONE_VALUE = '';

/**
 * No shadcn `Select` exists yet (design-system Sprint 2 scope) — plain `<select>` styled with
 * `cn()`, matching the convention already used for garment category/position pickers.
 */
export function DefaultAestheticSelector({
  value,
  onChange,
  availableAesthetics,
}: DefaultAestheticSelectorProps): JSX.Element {
  return (
    <label className="block text-sm font-medium">
      Estética por defecto
      <select
        value={value ?? NONE_VALUE}
        onChange={e => onChange(e.target.value === NONE_VALUE ? null : e.target.value)}
        className={cn(
          'mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
      >
        <option value={NONE_VALUE}>Sin preferencia</option>
        {availableAesthetics.map(aesthetic => (
          <option key={aesthetic} value={aesthetic}>
            {aesthetic}
          </option>
        ))}
      </select>
    </label>
  );
}
