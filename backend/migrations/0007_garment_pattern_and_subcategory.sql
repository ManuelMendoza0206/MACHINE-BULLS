-- Migracion 0007: Agrega subcategoria y patron visual CLIP a prendas (soporte 6 clases + estampados)
ALTER TABLE public.garments ADD COLUMN IF NOT EXISTS subcategory VARCHAR(50);
ALTER TABLE public.garments ADD COLUMN IF NOT EXISTS pattern VARCHAR(50);
