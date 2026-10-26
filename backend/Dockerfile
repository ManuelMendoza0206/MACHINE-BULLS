# syntax=docker/dockerfile:1
# StyleMe backend — FastAPI + CLIP local + VTON.
#
# Decisiones para la demo del lunes:
# - uv instala desde uv.lock (reproducible), sin el venv del host.
# - torch SOLO del índice CPU: la rueda default trae CUDA (~2.5GB) y acá no hay GPU.
# - El modelo CLIP se hornea en la imagen: en runtime no hace falta red
#   (HF_HUB_OFFLINE=1 lo fuerza a usar la caché local).
FROM python:3.12-slim

# libGL/glib: opencv (dependencia de mediapipe, pose_check) los necesita en la
# imagen slim; sin esto el import revienta en runtime, no en build.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 libglib2.0-0 libegl1 libgles2 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.12.5 /uv /bin/uv
ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=600 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 1) Dependencias bloqueadas por el lock (sin grupo dev).
#    Cache mount + reintentos: la red contra files.pythonhosted.org corta
#    conexiones con wheels pesadas (pyarrow/pandas de mlflow); cada reintento
#    retoma con lo que la caché ya bajó en vez de empezar de cero.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    sh -c 'for i in 1 2 3 4 5; do if uv sync --frozen --no-dev; then exit 0; fi; sleep 15; done; exit 1'

# 2) torch CPU (~200MB) sobre el venv ya resuelto — misma versión que el dev local.
RUN --mount=type=cache,target=/root/.cache/uv \
    sh -c 'for i in 1 2 3 4 5; do if uv pip install --python /app/.venv/bin/python \
      --index-url https://download.pytorch.org/whl/cpu "torch==2.14.1"; then exit 0; fi; sleep 15; done; exit 1'

# 3) Bake del modelo CLIP (~600MB): la demo no depende de HuggingFace en runtime.
#    SIN cache mount: el modelo tiene que quedar en la capa de la imagen, no en
#    el overlay efímero de BuildKit (con eso en runtime HF_HUB_OFFLINE=1 no
#    encontraría nada). Los reintentos reanudan descargas parciales del hub.
RUN sh -c 'for i in 1 2 3 4; do if /app/.venv/bin/python -c "from transformers import CLIPModel, CLIPProcessor; \
CLIPProcessor.from_pretrained('"'"'openai/clip-vit-base-patch32'"'"'); \
CLIPModel.from_pretrained('"'"'openai/clip-vit-base-patch32'"'"')"; then exit 0; fi; sleep 15; done; exit 1'

# 4) Código de la app. main:app vive en src/ (igual que el dev local).
COPY src ./src
ENV PATH="/app/.venv/bin:$PATH" \
    HF_HUB_OFFLINE=1

WORKDIR /app/src
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=3)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
