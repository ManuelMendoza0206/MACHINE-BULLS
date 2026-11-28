import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Whether the user has accepted the photo consent/retention notice, gating garment uploads.
 *
 * **Placeholder policy, not Jaicel's real Q5 design** (`docs/sprint-plans/sprint-3/sprint-3-init-jaicel.md`
 * Tarea 1 — no spec, no ADR-008, no risk-register entry exist yet at time of writing). This
 * implements the minimum-viable fallback that doc itself prescribes for exactly this situation:
 * explicit consent shown once before the first upload, the photo retained only while the
 * garment stays active in the wardrobe. Replace this store (and `PhotoConsentGate`'s copy) the
 * moment the real Q5 spec lands — do not treat this as a ratified policy decision.
 *
 * Persisted to `localStorage` (survives a browser restart) rather than `sessionStorage` — asking
 * again every tab/session for a wardrobe app would be poor UX, and there is no per-account
 * backend record to defer to yet. Revisit once Q5 adds a server-side consent record.
 */
export interface PhotoConsentState {
  /** Flag anónimo / fallback local (mantiene compatibilidad con sesiones sin usuario Auth). */
  consentGiven: boolean;
  /** Registro persistido por ID de usuario en el navegador (`{ [userId]: true }`). */
  consentByUser: Record<string, boolean>;
  /** Consulta si el usuario (o sesión anónima si es null/undefined) ya aceptó. */
  hasConsent: (userId?: string | null) => boolean;
  /** Registra el consentimiento en modo anónimo / legado. */
  grant: () => void;
  /** Registra el consentimiento asociado a un usuario específico (o anónimo si no hay userId). */
  grantForUser: (userId?: string | null) => void;
  /** Sincroniza el consentimiento proveniente de la cuenta autenticada (Supabase metadata). */
  syncUserConsent: (userId: string, granted: boolean) => void;
}

export const usePhotoConsentStore = create<PhotoConsentState>()(
  persist(
    (set, get) => ({
      consentGiven: false,
      consentByUser: {},
      hasConsent: (userId?: string | null) => {
        const state = get();
        if (userId) {
          return Boolean(state.consentByUser[userId]);
        }
        return state.consentGiven;
      },
      grant: () => set({ consentGiven: true }),
      grantForUser: (userId?: string | null) => {
        if (!userId) {
          set({ consentGiven: true });
          return;
        }
        set(state => ({
          consentByUser: { ...state.consentByUser, [userId]: true },
        }));
      },
      syncUserConsent: (userId: string, granted: boolean) => {
        if (!userId || !granted) return;
        set(state => {
          if (state.consentByUser[userId]) return state;
          return {
            consentByUser: { ...state.consentByUser, [userId]: true },
          };
        });
      },
    }),
    {
      name: 'photo-consent-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
