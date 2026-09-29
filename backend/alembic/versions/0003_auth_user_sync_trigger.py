"""0003: trigger on_auth_user_created (spec §2.4 + G5).

SECURITY DEFINER justificado y documentado: el trigger debe insertar en
public."User" cuando RLS bloquearía al rol invocante; cuerpo mínimo (un
INSERT), search_path fijo. Ver checklist de seguridad del skill Supabase.
"""

from __future__ import annotations

from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

FUNCTION_SQL = """
CREATE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, created_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
"""

TRIGGER_SQL = """
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
"""


def upgrade() -> None:
    op.execute(FUNCTION_SQL)
    op.execute(TRIGGER_SQL)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users")
    op.execute("DROP FUNCTION IF EXISTS public.handle_new_auth_user()")
