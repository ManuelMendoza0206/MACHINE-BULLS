"""Pipeline de analisis de prendas (B2): CLIP zero-shot + colores dominantes.

Combina tres piezas reutilizables:

- `ml.models.clip_classifier.ClipClassifier` y `ml.models.prompts` (ADR-401:
  el servicio **importa** la libreria ML, no la reimplementa).
- `color_extraction.dominant_colors` para la armonia cromatica del
  recomendador.

La inferencia corre en CPU con el modelo `openai/clip-vit-base-patch32`
descargado localmente: no depende del HF Inference API ni de GPU. El modelo se
carga una sola vez por proceso (singleton) porque `from_pretrained` cuesta
~3s y cada upload pagaria eso.
"""

from __future__ import annotations

import threading
from typing import Any

from PIL import Image

from domain.enums import CATEGORY_TO_POSITION, CLIP_CATEGORIES
from ml.models.clip_classifier import ClipClassifier
from services.garment_analysis.color_extraction import dominant_colors

# Esteticas que el MVP reconoce. El plan original las define como "top
# aesthetics" arbitrables; esta lista es la version corta del lunes. CLIP las
# evalua zero-shot con el mismo truco de prompts que las categorias.
AESTHETICS = ("casual", "formal", "streetwear", "sporty", "elegant", "minimalist")

_AESTHETIC_TEMPLATES = (
    "a photo of a {c} outfit",
    "a studio product photo of a {c} style garment",
)

# Prompts de categoria para **inferencia runtime** (6 clases -> posicion).
#
# No son los TEMPLATES de `ml.models.prompts`: esos fueron evaluados en CI con
# `clip_labels_grueso.csv`, que solo tiene `bag` y `shoes` (2 clases), donde el
# template generico "a photo of a {c}" rinde bien. En runtime clasificamos 6
# categorias, y ahi "a photo of a bottom" no es ingles natural para prenda
# inferior (un humano diria "pants"/"trousers"), asi que CLIP colapsa a ~0.17
# (casi aleatorio) y confunde pantalones con outwear.
#
# Medido en las 3 prendas de `sample_data/`: con templates genericos 1/3
# correcta a ~0.17; con estos synsets naturales, 3/3 a 1.00. El servicio owns
# estos prompts porque su contrato es mapear a *posicion* (top/bottom/...),
# una preocupacion distinta del eval de la libreria (ADR-401: el servicio
# importa la libreria, no la reimplementa — configurar prompts es importar,
# no reimplementar).
_CATEGORY_PROMPTS: dict[str, str] = {
    "top": "a photo of a t-shirt",
    "bottom": "a photo of a pair of pants",
    "dress": "a photo of a dress",
    "outwear": "a photo of a jacket",
    "shoes": "a photo of a pair of shoes",
    "bag": "a photo of a handbag",
}

_lock = threading.Lock()
_classifier: ClipClassifier | None = None


def get_classifier() -> ClipClassifier:
    """Singleton perezoso del clasificador CLIP (thread-safe)."""
    global _classifier
    if _classifier is None:
        with _lock:
            if _classifier is None:
                _classifier = ClipClassifier()
    return _classifier


def classify_category(image: Image.Image) -> tuple[str, float, dict[str, float]]:
    """Categoria CLIP + confianza + todas las probabilidades de clase.

    Usa los prompts runtime del servicio (`_CATEGORY_PROMPTS`), no los TEMPLATES
    de eval de la libreria: ver el comentario de esa constante.
    """
    clf = get_classifier()
    clases = list(CLIP_CATEGORIES)
    textos = [_CATEGORY_PROMPTS[c] for c in clases]
    probs = ClipClassifier.probs_imagen(
        clf.model, clf.processor, image, textos, clf.device
    )
    total = sum(probs) or 1.0
    por_clase = [p / total for p in probs]
    mejor = max(range(len(clases)), key=lambda i: por_clase[i])
    return clases[mejor], por_clase[mejor], dict(zip(clases, por_clase))


def classify_aesthetics(image: Image.Image, top_n: int = 3) -> list[dict[str, Any]]:
    """Top-N esteticas CLIP con confianza normalizada a 1 sobre el total."""
    clf = get_classifier()
    textos = [t.format(c=a) for a in AESTHETICS for t in _AESTHETIC_TEMPLATES]
    probs = ClipClassifier.probs_imagen(clf.model, clf.processor, image, textos, clf.device)
    por_estetica: dict[str, float] = {}
    ancho = len(_AESTHETIC_TEMPLATES)
    for i, aest in enumerate(AESTHETICS):
        por_estetica[aest] = sum(probs[i * ancho : (i + 1) * ancho])
    total = sum(por_estetica.values()) or 1.0
    ordenadas = sorted(por_estetica.items(), key=lambda kv: -kv[1])[:top_n]
    return [{"aesthetic": k, "confidence": round(v / total, 4)} for k, v in ordenadas]


def analyze_garment(image: Image.Image) -> dict[str, Any]:
    """Analisis completo de una prenda para el MVP.

    Devuelve un dict listo para persistir y para la respuesta de upload:
    category, position, top_aesthetics, dominant_colors, embedding (CLIP image
    features, para el embedding_score del recomendador).
    """
    clf = get_classifier()
    category, _conf, _probs = classify_category(image)
    position = CATEGORY_TO_POSITION.get(category)
    aesthetics = classify_aesthetics(image)
    colors = dominant_colors(image)
    embedding = _image_embedding(clf, image)
    return {
        "category": category,
        "position": position.value if position else None,
        "top_aesthetics": aesthetics,
        "dominant_colors": colors,
        "embedding": embedding,
    }


def _image_embedding(clf: ClipClassifier, image: Image.Image) -> list[float]:
    """Embedding CLIP normalizado (512-d) para similitud coseno entre prendas.

    `get_image_features` cambio de forma entre versiones de transformers (el
    docstring de `ClipClassifier.probs_imagen` lo advierte): en versiones
    viejas devuelve un tensor, en >=5.x un `BaseModelOutputWithPooling` cuyo
    embedding vive en `pooler_output`. Maneja las dos para que el servicio no
    se rompa al actualizar la libreria.
    """
    import torch

    entrada = clf.processor(images=image, return_tensors="pt")
    entrada = {k: v.to(clf.device) for k, v in entrada.items()}
    with torch.no_grad():
        feats = clf.model.get_image_features(**entrada)

    # Normaliza a un tensor 2D (1, dim) sin importar la forma devuelta.
    if hasattr(feats, "pooler_output") and feats.pooler_output is not None:
        vec = feats.pooler_output
    elif torch.is_tensor(feats):
        vec = feats
    else:
        vec = torch.as_tensor(feats)
    if vec.dim() == 1:
        vec = vec.unsqueeze(0)

    vec = vec / vec.norm(dim=-1, keepdim=True)
    return [round(float(x), 6) for x in vec[0].tolist()]
