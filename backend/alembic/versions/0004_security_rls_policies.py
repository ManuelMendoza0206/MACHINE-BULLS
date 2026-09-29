"""0004: RLS + policies + grants (aporte del skill Supabase, fuera del
manifiesto de la spec pero exigido por el changelog vigente).

Reglas aplicadas: RLS en las 6 tablas; predicados de ownership con
``(select auth.uid())`` (cache de initplan); nunca ``auth.role()``;
UPDATE con USING + WITH CHECK; catálogo cápsula legible
(``user_id IS NULL``) con GRANT explícito porque el Data API ya no
expone tablas nuevas solo (breaking change oct-2026).
"""

from __future__ import annotations

from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None

TABLES = ("User", "Garment", "GarmentOwnership", "Outfit", "OutfitGarment", "VTONJob")

OWN = "(select auth.uid()) = user_id"
OUTFIT_OWN = (
    "EXISTS (SELECT 1 FROM \"Outfit\" o WHERE o.id = outfit_id AND o.user_id = (select auth.uid()))"
)

POLICIES = [
    # User: cada uno ve y edita solo su fila (el trigger la crea, no hay insert directo).
    ('CREATE POLICY "user_select_own" ON "User" FOR SELECT TO authenticated USING ((select auth.uid()) = id)',
     'DROP POLICY IF EXISTS "user_select_own" ON "User"'),
    ('CREATE POLICY "user_update_own" ON "User" FOR UPDATE TO authenticated USING ((select auth.uid()) = id) WITH CHECK ((select auth.uid()) = id)',
     'DROP POLICY IF EXISTS "user_update_own" ON "User"'),
    # Garment: dueño CRUD propio + cápsula pública en lectura.
    # Una sola policy SELECT para authenticated (OR en vez de dos policies:
    # advisors marca multiple_permissive_policies como WARN de performance).
    (f'CREATE POLICY "garment_select_own" ON "Garment" FOR SELECT TO authenticated USING (({OWN}) OR (user_id IS NULL))',
     'DROP POLICY IF EXISTS "garment_select_own" ON "Garment"'),
    ('CREATE POLICY "garment_select_capsule" ON "Garment" FOR SELECT TO anon USING (user_id IS NULL)',
     'DROP POLICY IF EXISTS "garment_select_capsule" ON "Garment"'),
    (f'CREATE POLICY "garment_insert_own" ON "Garment" FOR INSERT TO authenticated WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "garment_insert_own" ON "Garment"'),
    (f'CREATE POLICY "garment_update_own" ON "Garment" FOR UPDATE TO authenticated USING ({OWN}) WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "garment_update_own" ON "Garment"'),
    (f'CREATE POLICY "garment_delete_own" ON "Garment" FOR DELETE TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "garment_delete_own" ON "Garment"'),
    # GarmentOwnership: solo filas propias.
    (f'CREATE POLICY "ownership_select_own" ON "GarmentOwnership" FOR SELECT TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "ownership_select_own" ON "GarmentOwnership"'),
    (f'CREATE POLICY "ownership_insert_own" ON "GarmentOwnership" FOR INSERT TO authenticated WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "ownership_insert_own" ON "GarmentOwnership"'),
    (f'CREATE POLICY "ownership_delete_own" ON "GarmentOwnership" FOR DELETE TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "ownership_delete_own" ON "GarmentOwnership"'),
    # Outfit: CRUD propio.
    (f'CREATE POLICY "outfit_select_own" ON "Outfit" FOR SELECT TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "outfit_select_own" ON "Outfit"'),
    (f'CREATE POLICY "outfit_insert_own" ON "Outfit" FOR INSERT TO authenticated WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "outfit_insert_own" ON "Outfit"'),
    (f'CREATE POLICY "outfit_update_own" ON "Outfit" FOR UPDATE TO authenticated USING ({OWN}) WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "outfit_update_own" ON "Outfit"'),
    (f'CREATE POLICY "outfit_delete_own" ON "Outfit" FOR DELETE TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "outfit_delete_own" ON "Outfit"'),
    # OutfitGarment: vía ownership del Outfit padre.
    (f'CREATE POLICY "og_select_own" ON "OutfitGarment" FOR SELECT TO authenticated USING ({OUTFIT_OWN})',
     'DROP POLICY IF EXISTS "og_select_own" ON "OutfitGarment"'),
    (f'CREATE POLICY "og_insert_own" ON "OutfitGarment" FOR INSERT TO authenticated WITH CHECK ({OUTFIT_OWN})',
     'DROP POLICY IF EXISTS "og_insert_own" ON "OutfitGarment"'),
    (f'CREATE POLICY "og_update_own" ON "OutfitGarment" FOR UPDATE TO authenticated USING ({OUTFIT_OWN}) WITH CHECK ({OUTFIT_OWN})',
     'DROP POLICY IF EXISTS "og_update_own" ON "OutfitGarment"'),
    (f'CREATE POLICY "og_delete_own" ON "OutfitGarment" FOR DELETE TO authenticated USING ({OUTFIT_OWN})',
     'DROP POLICY IF EXISTS "og_delete_own" ON "OutfitGarment"'),
    # VTONJob: CRUD propio.
    (f'CREATE POLICY "vton_select_own" ON "VTONJob" FOR SELECT TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "vton_select_own" ON "VTONJob"'),
    (f'CREATE POLICY "vton_insert_own" ON "VTONJob" FOR INSERT TO authenticated WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "vton_insert_own" ON "VTONJob"'),
    (f'CREATE POLICY "vton_update_own" ON "VTONJob" FOR UPDATE TO authenticated USING ({OWN}) WITH CHECK ({OWN})',
     'DROP POLICY IF EXISTS "vton_update_own" ON "VTONJob"'),
    (f'CREATE POLICY "vton_delete_own" ON "VTONJob" FOR DELETE TO authenticated USING ({OWN})',
     'DROP POLICY IF EXISTS "vton_delete_own" ON "VTONJob"'),
]

GRANTS_UP = [
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "User" TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "Garment" TO authenticated',
    'GRANT SELECT ON "Garment" TO anon',
    'GRANT SELECT, INSERT, DELETE ON "GarmentOwnership" TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "Outfit" TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "OutfitGarment" TO authenticated',
    'GRANT SELECT, INSERT, UPDATE, DELETE ON "VTONJob" TO authenticated',
]
GRANTS_DOWN = [
    'REVOKE ALL ON "User" FROM authenticated',
    'REVOKE ALL ON "Garment" FROM authenticated',
    'REVOKE ALL ON "Garment" FROM anon',
    'REVOKE ALL ON "GarmentOwnership" FROM authenticated',
    'REVOKE ALL ON "Outfit" FROM authenticated',
    'REVOKE ALL ON "OutfitGarment" FROM authenticated',
    'REVOKE ALL ON "VTONJob" FROM authenticated',
]

# La tabla de versionado de Alembic no la lee la app: sin acceso para roles
# de API (advisors marca rls_disabled_in_public como ERROR si queda expuesta).
ALEMBIC_VERSION_LOCK = [
    "REVOKE ALL ON TABLE alembic_version FROM PUBLIC",
    "REVOKE ALL ON TABLE alembic_version FROM anon",
    "REVOKE ALL ON TABLE alembic_version FROM authenticated",
]


def upgrade() -> None:
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
    for create_sql, _drop_sql in POLICIES:
        op.execute(create_sql)
    for grant_sql in GRANTS_UP:
        op.execute(grant_sql)
    for lock_sql in ALEMBIC_VERSION_LOCK:
        op.execute(lock_sql)


def downgrade() -> None:
    for _create_sql, drop_sql in POLICIES:
        op.execute(drop_sql)
    for revoke_sql in GRANTS_DOWN:
        op.execute(revoke_sql)
    for table in TABLES:
        op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
