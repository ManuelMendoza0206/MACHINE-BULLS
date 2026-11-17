-- Migration 0003: Sincronización automática de identidad Supabase Auth -> public.users
-- Conforme a openspec/specs/backend/domain-and-database/spec.md §2.3
-- Requirement: "El sistema SHALL garantizar, vía trigger de base de datos, que todo registro exitoso en auth.users produce una fila correspondiente en User con el mismo id, sin llamada HTTP adicional del frontend."

-- En entornos locales/dev sin Supabase Cloud, crea auth.users solo si no existe todavía.
-- En Supabase Cloud el esquema auth y auth.users ya existen bajo supabase_auth_admin.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        CREATE SCHEMA IF NOT EXISTS auth;
        CREATE TABLE auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email VARCHAR(255) UNIQUE,
            raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Funcion disparada por el trigger con SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, created_at)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.email, NEW.id::text || '@supabase.user'),
    COALESCE(NEW.created_at::timestamp without time zone, timezone('utc'::text, now()))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Disparador tras insercion en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Backfill idempotente para usuarios creados antes de instalar el trigger
INSERT INTO public.users (id, email, created_at)
SELECT
    id::text,
    COALESCE(email, id::text || '@supabase.user'),
    COALESCE(created_at::timestamp without time zone, timezone('utc'::text, now()))
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

-- DOWN MIGRATION (Reversible per SLA):
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- DROP FUNCTION IF EXISTS public.handle_new_auth_user();
