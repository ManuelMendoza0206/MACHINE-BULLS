-- Migration 0002: Índices de rendimiento y políticas RLS de Supabase para tablas base

-- 1. Índices en claves foráneas y filtros frecuentes
CREATE INDEX IF NOT EXISTS idx_garments_owner ON public.garments(owner_id);
CREATE INDEX IF NOT EXISTS idx_garments_position ON public.garments(position);
CREATE INDEX IF NOT EXISTS idx_garment_ownerships_user ON public.garment_ownerships(user_id);
CREATE INDEX IF NOT EXISTS idx_garment_ownerships_garment ON public.garment_ownerships(garment_id);
CREATE INDEX IF NOT EXISTS idx_outfits_user ON public.outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_garments_outfit ON public.outfit_garments(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_garments_garment ON public.outfit_garments(garment_id);
CREATE INDEX IF NOT EXISTS idx_vton_jobs_user ON public.vton_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_vton_jobs_outfit ON public.vton_jobs(outfit_id);

-- 2. Habilitación de Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_ownerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_garments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vton_jobs ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS idempotentes para el rol authenticated de Supabase
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'Users can view and update own profile') THEN
        CREATE POLICY "Users can view and update own profile" ON public.users
            TO authenticated
            USING ((select auth.uid())::text = id)
            WITH CHECK ((select auth.uid())::text = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'garments' AND policyname = 'Users can read own and capsule garments') THEN
        CREATE POLICY "Users can read own and capsule garments" ON public.garments
            FOR SELECT TO authenticated
            USING (owner_id IS NULL OR (select auth.uid())::text = owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'garments' AND policyname = 'Users can manage own garments') THEN
        CREATE POLICY "Users can manage own garments" ON public.garments
            FOR ALL TO authenticated
            USING ((select auth.uid())::text = owner_id)
            WITH CHECK ((select auth.uid())::text = owner_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'garment_ownerships' AND policyname = 'Users can manage own garment ownerships') THEN
        CREATE POLICY "Users can manage own garment ownerships" ON public.garment_ownerships
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outfits' AND policyname = 'Users can manage own outfits') THEN
        CREATE POLICY "Users can manage own outfits" ON public.outfits
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'outfit_garments' AND policyname = 'Users can manage own outfit garments') THEN
        CREATE POLICY "Users can manage own outfit garments" ON public.outfit_garments
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.outfits o
                    WHERE o.id = outfit_id AND o.user_id = (select auth.uid())::text
                )
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.outfits o
                    WHERE o.id = outfit_id AND o.user_id = (select auth.uid())::text
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vton_jobs' AND policyname = 'Users can manage own vton jobs') THEN
        CREATE POLICY "Users can manage own vton jobs" ON public.vton_jobs
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;
END $$;

GRANT ALL ON public.users, public.garments, public.garment_ownerships, public.outfits, public.outfit_garments, public.vton_jobs TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.outfit_garments_id_seq TO authenticated;
GRANT SELECT ON public.garments TO anon;
