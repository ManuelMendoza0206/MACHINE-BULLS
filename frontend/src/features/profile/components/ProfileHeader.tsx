import type { JSX } from 'react';
import { Card, CardContent } from '@/components/ui/card';

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
    <Card>
      <CardContent className="space-y-1 p-6">
        <h1 className="text-xl font-semibold">{name}</h1>
        <p className="text-sm text-muted-foreground">{email}</p>
        <p className="text-xs text-muted-foreground">Miembro desde {memberSince}</p>
      </CardContent>
    </Card>
  );
}
