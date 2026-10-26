"""Fixtures compartidas del backend.

Dos decisiones que hacen rapidos y estables los tests:

- **Entorno fijado antes de importar la app**: SQLite en memoria, provider VTON
  en mock, media en un tmp. Si se importara `config` antes, `settings` quedaria
  con los defaults de disco y los tests escribirian en `backend/media`.
- **CLIP stubbeado por defecto**: `analyze_garment` se reemplaza con un
  analisis determinista. Los tests de inferencia real de CLIP viven en
  `src/ml/testing/` y corren aparte; aca queremos probar el contrato de la API,
  no la latencia de un modelo. Se puede optar por CLIP real con
  `USE_REAL_CLIP=1` para debugging local.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

import pytest

SRC = Path(__file__).resolve().parent.parent / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

# Hay que fijar el entorno ANTES de importar config: `settings` se resuelve al
# importar y no se recalcula.
#
# SQLite en ARCHIVO y no `:memory:`: FastAPI corre los endpoints en un threadpool
# y cada thread abriria su propia BD en memoria (tablas recien creadas en el
# thread principal no existirian ahi). Un archivo temporal lo comparten todos.
_TEST_DB = "/tmp/opencode/styleme_test.db"
_TEST_MEDIA = "/tmp/opencode/styleme_test_media"
Path(_TEST_DB).parent.mkdir(parents=True, exist_ok=True)
Path(_TEST_DB).unlink(missing_ok=True)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TEST_DB}")
os.environ.setdefault("VTON_PROVIDER", "mock")
os.environ.setdefault("MEDIA_DIR", _TEST_MEDIA)
# Cola ARQ: puerto muerto para que los tests SIEMPRE ejerzan el fallback a
# BackgroundTasks (determinista; el enqueue real lo cubre el smoke de compose
# y test_vton_fallback_sin_redis_completa_igual).
os.environ.setdefault("REDIS_URL", "redis://localhost:6399/0")
# Las imagenes de los tests son JPG sinteticos sin cuerpo: la validacion del
# protocolo A-Pose se apaga aca y se activa explicitamente en el test que la
# cubre (test_vton_pose_invalida_da_422).
os.environ.setdefault("POSE_VALIDATION", "off")


def _analisis_stub(imagen: Any) -> dict[str, Any]:
    """Analisis determinista que imita la forma de `analyze_garment`.

    La posicion se decide por el color dominante (no por nombre de archivo:
    `Image.open(BytesIO)` no conserva el nombre, asi que el stub no podria
    leerlo). Convencion fija para los tests:

    - rojo dominante -> bottom
    - verde dominante -> outerwear
    - cualquier otro -> top
    """
    rgb = tuple(imagen.convert("RGB").getpixel((0, 0)))[:3]
    r, g, b = rgb
    if r > g and r > b:
        posicion, categoria = "bottom", "bottom"
    elif g > r and g > b:
        posicion, categoria = "outerwear", "outwear"
    else:
        posicion, categoria = "top", "top"
    return {
        "category": categoria,
        "position": posicion,
        "top_aesthetics": [
            {"aesthetic": "casual", "confidence": 0.9},
            {"aesthetic": "sporty", "confidence": 0.1},
        ],
        "dominant_colors": [
            {"h": 200.0, "s": 50.0, "v": 60.0, "hex": "#336699", "mass": 0.7},
            {"h": 40.0, "s": 20.0, "v": 90.0, "hex": "#e6ddc2", "mass": 0.3},
        ],
        "embedding": [0.1] * 512,
    }


@pytest.fixture(scope="session", autouse=True)
def _clean_media_dir() -> None:
    """Limpia el directorio de media de tests al empezar la sesion.

    `Settings` es un dataclass frozen, asi que no se puede monkeypatchear
    `media_dir`; el conftest lo fija via env `MEDIA_DIR` antes de importar
    `config`. Aca solo garantizamos que arranque vacio.
    """
    import shutil

    from config import settings

    shutil.rmtree(settings.media_dir, ignore_errors=True)


@pytest.fixture(autouse=True)
def _fresh_db() -> None:
    """Recrea el esquema por test: el DB file se comparte entre tests.

    Sin esto, los uploads de un test quedarian visibles para el siguiente (el
    usuario demo es el mismo) y tests como `recommend_sin_prendas` fallarian
    por orden de ejecucion.
    """
    from db.session import engine
    from domain.models import Base

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch, tmp_path: Path):
    """Cliente de prueba contra la app real, con CLIP stubbeado."""
    if os.environ.get("USE_REAL_CLIP") != "1":
        from services.garment_analysis import analyzer

        monkeypatch.setattr(analyzer, "analyze_garment", _analisis_stub)
        # El router importa el nombre directamente; hay que patear el binding
        # que `api.garments` ya capturo.
        from api import garments

        monkeypatch.setattr(garments, "analyze_garment", _analisis_stub)

    from db.session import init_db
    from main import app

    init_db()
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def demo_user_id(client: Any) -> str:
    """user_id del usuario demo, creado en el primer upload/capsule."""
    from api.garments import DEMO_USER_EMAIL, get_demo_user
    from db.session import SessionLocal

    session = SessionLocal()
    try:
        # Asegura que exista.
        get_demo_user(session)
        from domain.models import User

        user = session.query(User).filter(User.email == DEMO_USER_EMAIL).first()
        assert user is not None
        return user.id
    finally:
        session.close()
