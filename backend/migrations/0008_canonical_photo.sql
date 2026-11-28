-- Migration 0007: Foto canónica del usuario con consentimiento informado y ciclo de vida
-- Cumple con mejores prácticas de Supabase Postgres y retención segura

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS canonical_photo_path VARCHAR(500);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS canonical_consent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS canonical_consent_at TIMESTAMP WITHOUT TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_canonical_photo ON public.users(id) WHERE canonical_photo_path IS NOT NULL;
