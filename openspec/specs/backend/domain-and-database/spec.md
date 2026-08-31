## Purpose
Define las entidades de dominio, los modelos SQLAlchemy 2.0/Pydantic v2, las migraciones y el seed de datos que sirven de fundamento a los tres pipelines de backend (garment-analysis-service, recommender-engine, vton-pipeline) y al api-gateway. Es la primera spec de backend a implementar — ninguna otra puede avanzar sin esta.

## Requirements

### Requirement: Entidades reflejan el modelo canónico sin desviación
El sistema SHALL implementar `User`, `Garment`, `Outfit`, `OutfitGarment`, `VTONJob` y `GarmentOwnership` con exactamente los campos definidos en `docs/context/plan-base.md` §10.1, sin agregar columnas no autorizadas.

#### Scenario: Verificación de paridad de schema
- **WHEN** se generan los modelos SQLAlchemy
- **THEN** cada campo de cada entidad corresponde 1:1 a un campo listado en `plan-base.md` §10.1 o `docs/context/backend-plan.md` §5.2 (`GarmentOwnership`), sin campos adicionales no documentados

### Requirement: Catálogo cápsula compartido sin duplicar prendas
El sistema SHALL permitir que una prenda del catálogo cápsula (`Garment.user_id IS NULL`) sea adoptada por múltiples usuarios vía `GarmentOwnership`, sin duplicar la fila de `Garment` ni su análisis ya computado.

#### Scenario: Dos usuarios adoptan la misma prenda cápsula
- **WHEN** el usuario A y el usuario B adoptan la misma prenda del catálogo cápsula
- **THEN** existen dos filas en `GarmentOwnership` (una por usuario) apuntando al mismo `garment_id`, y la fila de `Garment` permanece única

### Requirement: Sincronización de identidad sin intervención manual
El sistema SHALL garantizar, vía trigger de base de datos, que todo registro exitoso en `auth.users` produce una fila correspondiente en `User` con el mismo `id`, sin llamada HTTP adicional del frontend.

#### Scenario: Registro exitoso en Supabase Auth
- **WHEN** se inserta una fila en `auth.users` (signup exitoso)
- **THEN** el trigger `on_auth_user_created` inserta automáticamente la fila correspondiente en `User` dentro de la misma transacción, con `name` extraído de `raw_user_meta_data->>'name'`

#### Scenario: Fallo de inserción en User aborta el signup completo
- **WHEN** el `INSERT` en `User` disparado por el trigger falla (ej. constraint violado)
- **THEN** la transacción completa de `auth.users` también falla — nunca queda un usuario autenticado sin fila en `User`

### Requirement: Búsqueda vectorial de compatibilidad eficiente
El sistema SHALL exponer un índice HNSW sobre `Garment.compatibility_embedding` con métrica coseno, para que las consultas k-NN del recommender-engine resuelvan en menos de 500ms sobre el catálogo completo.

#### Scenario: Consulta k-NN sobre el catálogo completo
- **WHEN** el recommender-engine solicita las N prendas más compatibles con un embedding dado
- **THEN** la consulta usa el índice HNSW (`vector_cosine_ops`), no un escaneo secuencial, y resuelve en <500ms con hasta 10,000 prendas

### Requirement: Catálogo cápsula con cobertura mínima verificable en el seed
El sistema SHALL sembrar el catálogo "Básicos StyleMe" (50 prendas) cumpliendo cobertura mínima de al menos una prenda por posición de outfit y por estética objetivo, en el mismo momento del seed — no como verificación posterior.

#### Scenario: Ejecución del script de seed
- **WHEN** se ejecuta el script de seed del catálogo cápsula
- **THEN** el resultado contiene al menos una prenda por cada posición (`top`, `bottom`, `footwear`, `outerwear`) y por cada estética objetivo (Old Money, Streetwear, Soft Boy, Starboy, Gorpcore) definida en `plan-base.md`

---

## 1. Propósito y SLA

**Origen:** `docs/context/backend-plan.md` §5, §13 (B1).

**SLA:** las migraciones deben ser reproducibles y reversibles (Alembic upgrade/downgrade simétrico); el seed del catálogo cápsula debe completarse en menos de 30s; las consultas de listado (soporte de gaps G1/G3) deben paginar por cursor, nunca por offset, para no degradar con el crecimiento del catálogo.

## 2. Contratos

### 2.1 Entidades SQLAlchemy 2.0 (`src/domain/models.py`)

```python
from __future__ import annotations
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4
from sqlalchemy import ForeignKey, JSON, String, Float, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship, DeclarativeBase
from pgvector.sqlalchemy import Vector

class Base(DeclarativeBase):
    pass

class OutfitPosition(str, Enum):
    TOP = "top"
    BOTTOM = "bottom"
    FOOTWEAR = "footwear"
    OUTERWEAR = "outerwear"

class VtonJobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class GarmentSource(str, Enum):
    UPLOADED = "uploaded"
    CAPSULE = "capsule"

class User(Base):
    __tablename__ = "User"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Garment(Base):
    __tablename__ = "Garment"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID | None] = mapped_column(ForeignKey("User.id"), nullable=True)  # NULL = catálogo cápsula
    image_url: Mapped[str] = mapped_column(String, nullable=False)
    processed_image_url: Mapped[str] = mapped_column(String, nullable=False)
    category: Mapped[str] = mapped_column(String, nullable=False)  # ver nota de enum abierto, spec frontend 01 §2.3
    aesthetic_scores: Mapped[dict] = mapped_column(JSON, nullable=False)
    dominant_colors_hsv: Mapped[dict] = mapped_column(JSON, nullable=False)
    compatibility_embedding: Mapped[list[float]] = mapped_column(Vector(128), nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class GarmentOwnership(Base):
    __tablename__ = "GarmentOwnership"
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), primary_key=True)
    garment_id: Mapped[UUID] = mapped_column(ForeignKey("Garment.id"), primary_key=True)
    source: Mapped[GarmentSource] = mapped_column(SAEnum(GarmentSource), nullable=False)
    added_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class Outfit(Base):
    __tablename__ = "Outfit"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    aesthetic: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class OutfitGarment(Base):
    __tablename__ = "OutfitGarment"
    outfit_id: Mapped[UUID] = mapped_column(ForeignKey("Outfit.id"), primary_key=True)
    garment_id: Mapped[UUID] = mapped_column(ForeignKey("Garment.id"), primary_key=True)
    position: Mapped[OutfitPosition] = mapped_column(SAEnum(OutfitPosition), nullable=False)

class VTONJob(Base):
    __tablename__ = "VTONJob"
    id: Mapped[UUID] = mapped_column(PGUUID, primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("User.id"), nullable=False)
    user_photo_url: Mapped[str] = mapped_column(String, nullable=False)
    outfit_id: Mapped[UUID] = mapped_column(ForeignKey("Outfit.id"), nullable=False)
    status: Mapped[VtonJobStatus] = mapped_column(SAEnum(VtonJobStatus), default=VtonJobStatus.PENDING)
    result_url: Mapped[str | None] = mapped_column(String, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 2.2 Schemas Pydantic v2 (`src/domain/schemas.py`) — deben coincidir con los Zod del frontend

```python
from pydantic import BaseModel, Field, ConfigDict

class AestheticScore(BaseModel):
    model_config = ConfigDict(frozen=True)
    aesthetic: str
    confidence: float = Field(ge=0, le=1)

class DominantColor(BaseModel):
    model_config = ConfigDict(frozen=True)
    h: float = Field(ge=0, le=360)
    s: float = Field(ge=0, le=100)
    v: float = Field(ge=0, le=100)
    hex: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")

class GarmentUploadResponse(BaseModel):
    garment_id: str
    category: str
    top_aesthetics: list[AestheticScore]
    dominant_colors: list[DominantColor]
    processed_image_url: str
```
**Regla de paridad:** este archivo se revisa contra `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.3 en cada cambio — cualquier divergencia de nombre de campo, tipo o nullability es un defecto de spec, no un detalle de implementación.

### 2.3 Migraciones y extensión pgvector

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX garment_embedding_hnsw_idx ON "Garment"
  USING hnsw (compatibility_embedding vector_cosine_ops);
```
Gestionadas vía Alembic (`alembic upgrade head` / `alembic downgrade -1` simétricos, verificados en CI).

### 2.4 Trigger de sincronización de identidad (G5)

```sql
CREATE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, created_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
```

## 3. Flujo de Datos Interno

```
Alembic migration ──► crea tablas + extensión pgvector + índice HNSW + trigger G5
        │
        v
Script de seed ──► inserta 50 Garments (user_id=NULL, source implícito capsule)
        │           ──► verifica cobertura mínima (posición × estética) ANTES de terminar
        │           ──► si falla cobertura, aborta el seed (no deja catálogo incompleto)
        v
Backend listo para que garment-analysis-service, recommender-engine y api-gateway
lean/escriban sobre este schema
```

## 4. Estrategia de Pruebas

**Unitarias (pytest):**
- Cada modelo SQLAlchemy instanciable con datos válidos, rechaza campos fuera de enum (`OutfitPosition`, `VtonJobStatus`, `GarmentSource`).
- Schemas Pydantic: casos nominales e inválidos por campo (igual patrón que los tests Zod del frontend, spec 01 §4).

**Integración (pytest + testcontainers Postgres con pgvector):**
- Migración `upgrade head` seguida de `downgrade base` sin error, dos veces consecutivas (idempotencia).
- Trigger G5: insertar en `auth.users` (tabla simulada en el test) → verificar fila creada en `User` con `id` idéntico.
- Trigger G5: forzar fallo de constraint en `User` → verificar que el INSERT en `auth.users` también revierte (rollback transaccional).
- `GarmentOwnership`: dos usuarios adoptan la misma prenda cápsula → 2 filas de ownership, 1 fila de `Garment`.
- Consulta k-NN sobre fixture de 1,000 embeddings aleatorios → usa el índice HNSW (verificado vía `EXPLAIN ANALYZE`, no solo que el resultado sea correcto).
- Seed del catálogo cápsula → cobertura mínima verificada programáticamente sobre el resultado insertado.

## 5. Criterios de Aceptación

- [ ] Los 6 modelos SQLAlchemy (`User`, `Garment`, `GarmentOwnership`, `Outfit`, `OutfitGarment`, `VTONJob`) existen con exactamente los campos de §2.1, sin columnas no autorizadas.
- [ ] Los schemas Pydantic de §2.2 coinciden campo a campo con los Zod de `openspec/specs/frontend/api-client-and-schemas/spec.md` §2.3.
- [ ] Migración Alembic `upgrade`/`downgrade` simétrica, verificada en CI.
- [ ] Índice HNSW creado y usado (no bypaseado) por la consulta k-NN de referencia, verificado con `EXPLAIN ANALYZE` en un test.
- [ ] Trigger `on_auth_user_created` implementado y verificado con los 2 escenarios de la Requirement correspondiente (éxito y fallo transaccional).
- [ ] Script de seed del catálogo cápsula verifica cobertura mínima (posición + estética) antes de terminar, y aborta si no la cumple.
- [ ] `GarmentOwnership` soporta N usuarios por prenda cápsula sin duplicar `Garment`, verificado por test.
- [ ] `pytest tests/ -v --cov=src` ≥ 90% de cobertura en `src/domain/`.

## 6. Manifiesto de Archivos

```
src/domain/models.py
src/domain/schemas.py
src/domain/enums.py
migrations/versions/0001_initial_schema.py
migrations/versions/0002_pgvector_hnsw_index.py
migrations/versions/0003_auth_user_sync_trigger.py
scripts/seed_capsule_catalog.py
tests/unit/domain/test_models.py
tests/unit/domain/test_schemas.py
tests/integration/domain/test_migrations.py
tests/integration/domain/test_auth_sync_trigger.py
tests/integration/domain/test_garment_ownership.py
tests/integration/domain/test_vector_search_index.py
tests/integration/scripts/test_seed_capsule_catalog.py
```
