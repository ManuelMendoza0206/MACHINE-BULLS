-- Migration 0001: Esquema base relacional de StyleMe en public (Supabase Postgres + pgvector)
-- Sincronizado campo a campo con backend/src/domain/models.py

-- Extensión vectorial para embeddings CLIP
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Usuarios de la aplicación (sincronizados con auth.users vía trigger 0003)
CREATE TABLE IF NOT EXISTS public.users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- 2. Prendas (propias de usuario o catálogo cápsula con owner_id NULL)
CREATE TABLE IF NOT EXISTS public.garments (
    id VARCHAR(36) PRIMARY KEY,
    owner_id VARCHAR(36) REFERENCES public.users(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL,
    position VARCHAR(20),
    image_path VARCHAR(500) NOT NULL,
    processed_image_path VARCHAR(500) NOT NULL,
    dominant_colors JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_aesthetics JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- 3. Propiedad usuario-prenda (soporta adopción de cápsula sin duplicar fila en garments)
CREATE TABLE IF NOT EXISTS public.garment_ownerships (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    garment_id VARCHAR(36) NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL DEFAULT 'capsule',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    CONSTRAINT uq_owner_garment UNIQUE (user_id, garment_id)
);

-- 4. Outfits generados por el recomendador
CREATE TABLE IF NOT EXISTS public.outfits (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    aesthetic VARCHAR(50) NOT NULL DEFAULT 'casual',
    chromatic_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    embedding_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);

-- 5. Relación outfit-prendas con posición y orden de capa
CREATE TABLE IF NOT EXISTS public.outfit_garments (
    id SERIAL PRIMARY KEY,
    outfit_id VARCHAR(36) NOT NULL REFERENCES public.outfits(id) ON DELETE CASCADE,
    garment_id VARCHAR(36) NOT NULL REFERENCES public.garments(id) ON DELETE CASCADE,
    position VARCHAR(20) NOT NULL,
    layer_index INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT uq_outfit_garment UNIQUE (outfit_id, garment_id)
);

-- 6. Trabajos asíncronos de Probador Virtual (CatVTON)
CREATE TABLE IF NOT EXISTS public.vton_jobs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    outfit_id VARCHAR(36) REFERENCES public.outfits(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    stage VARCHAR(30),
    result_path VARCHAR(500),
    error_message VARCHAR(1000),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')
);
