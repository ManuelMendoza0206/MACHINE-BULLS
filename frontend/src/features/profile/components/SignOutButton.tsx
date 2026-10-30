'use client';

import { useState, type JSX } from 'react';
import { useRouter } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/hooks/useAuth';

/**
 * Botón de cierre de sesión con confirmación explícita (profile-flow, spec §Requirement
 * "Cierre de sesión requiere confirmación explícita"). El clic inicial solo abre el diálogo;
 * únicamente el botón de confirmar invoca `useAuth().signOut()`. Tras cerrar sesión navega a
 * `/` (spec §3.3) — sin esto el usuario se queda parado en una ruta protegida hasta la
 * próxima navegación, ya que `signOut()` solo limpia estado de cliente, no fuerza un reload.
 */
export function SignOutButton(): JSX.Element {
  const { signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleConfirm(): Promise<void> {
    setPending(true);
    try {
      await signOut();
      router.push('/');
    } finally {
      setPending(false);
      setOpen(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="destructive">Cerrar sesión</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md bg-background p-6 shadow-lg">
          <Dialog.Title className="text-lg font-semibold">¿Cerrar sesión?</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            Tendrás que volver a iniciar sesión para acceder a tu cuenta.
          </Dialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancelar</Button>
            </Dialog.Close>
            <Button variant="destructive" onClick={handleConfirm} disabled={pending}>
              Confirmar
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
