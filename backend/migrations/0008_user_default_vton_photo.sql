-- Migracion 0008: Foto corporal privada por defecto para pruebas virtuales (VTON)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS vton_photo_path VARCHAR(512);
