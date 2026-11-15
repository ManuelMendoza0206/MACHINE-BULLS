-- Migration 0005: Smart Shopping ("Before You Buy"), contexto climático/ocasión y registro de uso de outfits
-- Cumple con las mejores prácticas de Supabase Postgres (RLS, índices de claves foráneas y tipos optimizados)

-- 1. Soporte de prendas candidatas de compra en garments
ALTER TABLE public.garments ADD COLUMN IF NOT EXISTS is_candidate BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_garments_owner_candidate ON public.garments(owner_id, is_candidate);

-- 2. Atributos de contexto y explicabilidad en outfits
ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS occasion VARCHAR(50);
ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS weather VARCHAR(50);
ALTER TABLE public.outfits ADD COLUMN IF NOT EXISTS reason TEXT;
CREATE INDEX IF NOT EXISTS idx_outfits_user_occasion ON public.outfits(user_id, occasion);

-- 3. Tabla de registro de outfits utilizados (calendario de uso y prendas más/menos usadas)
CREATE TABLE IF NOT EXISTS public.outfit_usage_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(36) NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
    worn_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_user_outfit_worn_date UNIQUE (user_id, outfit_id, worn_date)
);

CREATE INDEX IF NOT EXISTS idx_outfit_usage_user ON public.outfit_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_usage_outfit ON public.outfit_usage_logs(outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_usage_user_date ON public.outfit_usage_logs(user_id, worn_date);

-- 4. Seguridad RLS para outfit_usage_logs
ALTER TABLE public.outfit_usage_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'outfit_usage_logs' AND policyname = 'Users can manage own outfit usage'
    ) THEN
        CREATE POLICY "Users can manage own outfit usage" ON public.outfit_usage_logs
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;
END $$;

GRANT ALL ON public.outfit_usage_logs TO authenticated;
GRANT SELECT ON public.outfit_usage_logs TO anon;
