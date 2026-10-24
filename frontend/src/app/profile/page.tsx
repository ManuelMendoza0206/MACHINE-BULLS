import type { JSX } from 'react';
import { ProfileView } from '@/features/profile/components/ProfileView';

export default function PerfilPage(): JSX.Element {
  return (
    <section className="mx-auto max-w-7xl p-8">
      <h1 className="text-2xl font-semibold">Perfil</h1>
      <p className="mt-2 text-muted-foreground">Tu cuenta, tu armario y el estado del sistema.</p>
      <div className="mt-6">
        <ProfileView />
      </div>
    </section>
  );
}
