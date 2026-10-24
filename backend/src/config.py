"""Configuracion del backend MVP leida del entorno.

El MVP corre en SQLite por defecto para que la demo del lunes no dependa de un
servidor Postgres levantado; `DATABASE_URL` permite cambiar a Postgres (con
pgvector) sin tocar codigo. El spec de dominio pide Postgres+pgvector y ahi va
produccion; esta capa es el unico punto que conoce la diferencia.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = BASE_DIR.parent / "media"

# El frontend corre en localhost:3000 y el backend en 8000; CORS se abre para
# ambos hosts en la demo. En produccion esto va detras del mismo origen.
DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"


def _load_dotenv(path: Path) -> None:
    """Carga un .env simple sin depender de python-dotenv (que no esta en deps).

    Solo parsea `CLAVE=valor` sin comillas ni expansion; alcanza para el .env del
    backend que tiene dos lineas. No pisa variables ya presentes en el entorno,
    asi que un valor exportado a mano gana sobre el archivo.
    """
    if not path.is_file():
        return
    for linea in path.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        clave, _, valor = linea.partition("=")
        clave = clave.strip()
        if clave and clave not in os.environ:
            os.environ[clave] = valor.strip()


@dataclass(frozen=True)
class Settings:
    """Ajustes efectivos de la aplicacion, resueltos una vez al importar."""

    database_url: str
    replicate_api_token: str | None
    vton_provider: str
    # Endpoint propio de VTON (VM interna con IDM-VTON servido por HTTP).
    # Si esta seteado, `VTON_PROVIDER=auto` lo prioriza sobre Replicate.
    vton_http_url: str | None
    vton_http_timeout_s: float
    public_base_url: str
    cors_origins: list[str]
    media_dir: Path

    @property
    def media_url_base(self) -> str:
        """Base http para URLs de archivos en media (processed/result images)."""
        return f"{self.public_base_url.rstrip('/')}/media"


def load_settings() -> Settings:
    """Resuelve settings desde entorno, con defaults pensados para la demo."""
    _load_dotenv(BASE_DIR.parent / ".env")
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./styleme.db")
    origins = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if o.strip()
    ]
    return Settings(
        database_url=database_url,
        replicate_api_token=os.environ.get("REPLICATE_API_TOKEN") or None,
        vton_provider=os.environ.get("VTON_PROVIDER", "auto"),
        vton_http_url=os.environ.get("VTON_HTTP_URL") or None,
        # En CPU/VM puede tardar bastante; default generoso y configurable
        # (`or "300"` tolera un env vacío que rompería float("")).
        vton_http_timeout_s=float(os.environ.get("VTON_HTTP_TIMEOUT_S", "300")),
        public_base_url=os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000"),
        cors_origins=origins,
        media_dir=Path(os.environ.get("MEDIA_DIR", str(MEDIA_DIR))),
    )


settings = load_settings()
