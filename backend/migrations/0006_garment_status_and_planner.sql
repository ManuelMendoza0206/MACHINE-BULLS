-- Migration 0006: Disponibilidad de prendas y Planificador de vestimenta (Outfit Planner)
-- Cumple con las mejores prácticas de Supabase Postgres (RLS, índices y tipos optimizados)

-- 1. Estado operativo en garments (AVAILABLE, LAUNDRY, REPAIR, INACTIVE)
ALTER TABLE public.garments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE';
CREATE INDEX IF NOT EXISTS idx_garments_owner_status ON public.garments(owner_id, status);

-- 2. Tabla de planificación de vestimenta (Outfit Planner)
CREATE TABLE IF NOT EXISTS public.outfit_plans (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(36) REFERENCES public.outfits(id) ON DELETE SET NULL,
    garment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    planned_date DATE NOT NULL,
    occasion VARCHAR(50),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc')
);

CREATE INDEX IF NOT EXISTS idx_outfit_plans_user ON public.outfit_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_plans_user_date ON public.outfit_plans(user_id, planned_date);
CREATE INDEX IF NOT EXISTS idx_outfit_plans_status ON public.outfit_plans(status);

-- 3. Seguridad RLS para outfit_plans
ALTER TABLE public.outfit_plans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'outfit_plans' AND policyname = 'Users can manage own outfit plans'
    ) THEN
        CREATE POLICY "Users can manage own outfit plans" ON public.outfit_plans
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;
END $$;

GRANT ALL ON public.outfit_plans TO authenticated;
GRANT SELECT ON public.outfit_plans TO anon;
