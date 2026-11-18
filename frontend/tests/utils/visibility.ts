/**
 * Control de `document.visibilityState` para tests (E0-T3 / E1-T3).
 *
 * Los tests de polling pausan/resuman la pestaña simulando `visibilitychange`.
 * El descriptor original se captura al importar y `restoreVisibilityState()`
 * debe correr en `afterEach`: sin eso, el estado definido por un test se filtra
 * a los demas (flakiness por orden de ejecucion).
 */
const original = Object.getOwnPropertyDescriptor(document, 'visibilityState');

/** Define el estado y dispara `visibilitychange` (llamar dentro de `act`). */
export function setVisibilityState(state: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', {
    value: state,
    writable: true,
    configurable: true,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

/** Restaura el descriptor original (en `afterEach`). */
export function restoreVisibilityState(): void {
  if (original) {
    Object.defineProperty(document, 'visibilityState', original);
  }
}
