-- Migration 0004: Persistencia de feedback de usuario sobre outfits (Like / Dislike)
-- Permite al motor de recomendación aprender gustos y personalizar futuras combinaciones.

CREATE TABLE IF NOT EXISTS public.outfit_feedbacks (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(36) NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL, -- +1 like, -1 dislike
    feedback_type VARCHAR(50),
    notes VARCHAR(500),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_user_outfit_feedback UNIQUE (user_id, outfit_id)
);

CREATE INDEX IF NOT EXISTS idx_outfit_feedbacks_user ON public.outfit_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_outfit_feedbacks_outfit ON public.outfit_feedbacks(outfit_id);

-- Seguridad RLS para outfit_feedbacks
ALTER TABLE public.outfit_feedbacks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'outfit_feedbacks' AND policyname = 'Users can manage own outfit feedback'
    ) THEN
        CREATE POLICY "Users can manage own outfit feedback" ON public.outfit_feedbacks
            TO authenticated
            USING ((select auth.uid())::text = user_id)
            WITH CHECK ((select auth.uid())::text = user_id);
    END IF;
END $$;

GRANT ALL ON public.outfit_feedbacks TO authenticated;
