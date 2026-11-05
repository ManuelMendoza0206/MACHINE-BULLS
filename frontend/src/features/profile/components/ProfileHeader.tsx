import type { JSX } from 'react';
import { Card } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export interface ProfileHeaderProps {
  name: string;
  email: string;
  /** ISO date string — rendered as "Miembro desde {mes año}". */
  createdAt: string;
}

const MEMBER_SINCE_FORMAT = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });

/**
 * Read-only — `plan-base.md` §11 has no `PATCH`/`PUT` on `User`, so no edit control exists
 * here (profile-flow/spec.md §6.1, Requirement "Perfil de solo lectura"). Renders directly
 * from the already-resolved session, no network call (spec §1 SLA).
 */
export function ProfileHeader({ name, email, createdAt }: ProfileHeaderProps): JSX.Element {
  const memberSince = MEMBER_SINCE_FORMAT.format(new Date(createdAt));

  return (
    <Card className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-background/85 shadow-sm p-6 sm:p-7">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent font-bold text-lg">
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{name}</h1>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 text-accent" />
          <span>Miembro desde {memberSince}</span>
        </div>
      </div>
    </Card>
  );
}
