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

# El frontend corre en localhost:3000 (o 3001 si 3000 esta ocupado) y el backend en 8000.
# CORS permite origenes locales para desarrollo y demo.
DEFAULT_CORS_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"



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


def _positive_int(name: str, default: int) -> int:
    value = int(os.environ.get(name, str(default)))
    if value <= 0:
        raise ValueError(f"{name} debe ser mayor que cero")
    return value


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
    # Cola asincrona (ARQ). Si Redis no responde al encolar, el backend cae a
    # BackgroundTasks y la demo sigue (ver services/queue.py).
    redis_url: str
    public_base_url: str
    cors_origins: list[str]
    media_dir: Path
    # Almacenamiento en la nube (Azure Blob Storage)
    azure_storage_connection_string: str | None
    azure_storage_container_name: str
    azure_storage_public_url_base: str | None
    supabase_jwt_secret: str | None
    supabase_url: str | None
    environment: str
    allow_demo_auth: bool
    allow_unverified_jwt: bool
    trusted_proxy_ips: tuple[str, ...]
    max_upload_bytes: int
    max_image_pixels: int
    # Modelo CLIP para clasificacion y embedding de prendas
    clip_model_name: str
    # Umbral de confianza minima de CLIP para disparar fallback ResNet-50 (86e3122f7)
    clip_confidence_threshold: float
    resnet_fallback_enabled: bool
    vton_failover_enabled: bool

    @property
    def media_url_base(self) -> str:
        """Base http para URLs de archivos en media (processed/result images)."""
        return f"{self.public_base_url.rstrip('/')}/media"


def load_settings() -> Settings:
    """Resuelve settings desde entorno, con defaults pensados para la demo."""
    _load_dotenv(BASE_DIR.parent / ".env")
    database_url = os.environ.get("DATABASE_URL", "sqlite:///./styleme.db")
    if database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url[len("postgresql://") :]
    origins = [
        o.strip()
        for o in os.environ.get("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",")
        if o.strip()
    ]
    environment = os.environ.get("ENV", "development").strip().lower()
    production = environment in {"production", "prod"}
    return Settings(
        database_url=database_url,
        replicate_api_token=os.environ.get("REPLICATE_API_TOKEN") or None,
        vton_provider=os.environ.get("VTON_PROVIDER", "auto"),
        vton_http_url=os.environ.get("VTON_HTTP_URL") or None,
        # En CPU/VM puede tardar bastante; default generoso y configurable
        # (`or "300"` tolera un env vacío que rompería float("")).
        vton_http_timeout_s=float(os.environ.get("VTON_HTTP_TIMEOUT_S", "300")),
        redis_url=os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
        public_base_url=os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000"),
        cors_origins=origins,
        media_dir=Path(os.environ.get("MEDIA_DIR", str(MEDIA_DIR))),
        azure_storage_connection_string=os.environ.get("AZURE_STORAGE_CONNECTION_STRING") or None,
        azure_storage_container_name=os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "styleme"),
        azure_storage_public_url_base=os.environ.get("AZURE_STORAGE_PUBLIC_URL_BASE") or None,
        supabase_jwt_secret=os.environ.get("SUPABASE_JWT_SECRET") or None,
        supabase_url=os.environ.get("SUPABASE_URL") or None,
        environment=environment,
        allow_demo_auth=os.environ.get("ALLOW_DEMO_AUTH", "false" if production else "true").lower() in ("1", "true", "yes"),
        allow_unverified_jwt=os.environ.get("ALLOW_UNVERIFIED_JWT", "false").lower() in ("1", "true", "yes"),
        trusted_proxy_ips=tuple(ip.strip() for ip in os.environ.get("TRUSTED_PROXY_IPS", "").split(",") if ip.strip()),
        max_upload_bytes=_positive_int("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
        max_image_pixels=_positive_int("MAX_IMAGE_PIXELS", 25_000_000),
        clip_model_name=os.environ.get("CLIP_MODEL_NAME", "patrickjohncyh/fashion-clip"),
        clip_confidence_threshold=float(os.environ.get("CLIP_CONFIDENCE_THRESHOLD", "0.40")),
        resnet_fallback_enabled=os.environ.get("RESNET_FALLBACK_ENABLED", "1").lower() in ("1", "true", "yes"),
        vton_failover_enabled=os.environ.get("VTON_FAILOVER_ENABLED", "1").lower() in ("1", "true", "yes"),
    )


settings = load_settings()
