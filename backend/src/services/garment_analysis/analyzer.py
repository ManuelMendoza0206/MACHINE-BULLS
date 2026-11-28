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

from PIL import Image, ImageOps

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
_CATEGORY_SYNSETS: dict[str, tuple[tuple[str, str], ...]] = {
    "top": (
        ("t-shirt", "a studio product photo of a t-shirt"),
        ("shirt", "a studio product photo of a button-up shirt or blouse"),
        ("sweater", "a studio product photo of a knit sweater or pullover"),
        ("hoodie", "a studio product photo of a hoodie or sweatshirt"),
        ("polo", "a studio product photo of a tank top or polo shirt"),
    ),
    "bottom": (
        ("pants", "a studio product photo of a pair of pants or trousers"),
        ("jeans", "a studio product photo of a pair of jeans"),
        ("skirt", "a studio product photo of a skirt"),
        ("shorts", "a studio product photo of a pair of shorts"),
        ("joggers", "a studio product photo of joggers or leggings"),
    ),
    "dress": (
        ("dress", "a studio product photo of a full-length or midi dress"),
        ("midi dress", "a studio product photo of a short casual or cocktail dress"),
        ("sundress", "a studio product photo of a sundress"),
        ("jumpsuit", "a studio product photo of a jumpsuit or romper"),
    ),
    "outwear": (
        ("jacket", "a studio product photo of a jacket"),
        ("coat", "a studio product photo of a long coat or trench coat"),
        ("blazer", "a studio product photo of a blazer or suit jacket"),
        ("cardigan", "a studio product photo of a cardigan or puffer jacket"),
    ),
    "shoes": (
        ("sneakers", "a studio product photo of a pair of sneakers"),
        ("boots", "a studio product photo of a pair of boots or ankle boots"),
        ("loafers", "a studio product photo of loafers or dress shoes"),
        ("heels", "a studio product photo of heels or sandals"),
    ),
    "bag": (
        ("handbag", "a studio product photo of a handbag or purse"),
        ("backpack", "a studio product photo of a backpack"),
        ("tote bag", "a studio product photo of a tote bag"),
        ("crossbody bag", "a studio product photo of a crossbody or shoulder bag"),
    ),
}

_lock = threading.Lock()
_classifier: ClipClassifier | None = None
_adapter_model: Any = None
_adapter_checked: bool = False


def get_aesthetic_adapter() -> Any:
    """Carga el adaptador de 128-D entrenado si existe en `models/fashion_clip_adapter.pt`."""
    global _adapter_model, _adapter_checked
    if not _adapter_checked:
        with _lock:
            if not _adapter_checked:
                _adapter_checked = True
                from pathlib import Path

                import torch

                from ml.models.adapter import AestheticProjectionHead

                repo_root = Path(__file__).resolve().parents[4]
                ckpt1 = repo_root / "models" / "fashion_clip_adapter.pt"
                ckpt2 = repo_root / "backend" / "models" / "fashion_clip_adapter.pt"
                ckpt = ckpt1 if ckpt1.exists() else ckpt2
                if ckpt.exists():
                    try:
                        head = AestheticProjectionHead(
                            input_dim=512, hidden_dim=256, output_dim=128, num_aesthetics=12
                        )
                        state = torch.load(ckpt, map_location="cpu")
                        head.load_state_dict(state)
                        head.eval()
                        _adapter_model = head
                    except Exception:  # noqa: BLE001
                        _adapter_model = None
    return _adapter_model


def get_classifier() -> ClipClassifier:
    """Singleton perezoso del clasificador CLIP (thread-safe)."""
    global _classifier
    if _classifier is None:
        with _lock:
            if _classifier is None:
                from config import settings

                _classifier = ClipClassifier(model_name=settings.clip_model_name)
    return _classifier


def _prepare_for_clip(image: Image.Image) -> Image.Image:
    """Prepara la imagen para CLIP: fondo blanco de estudio y padding cuadrado.

    El padding cuadrado evita que el recorte central de CLIP corte la parte inferior
    de vestidos o pantalones largos.
    """
    if image.mode == "RGBA":
        rgb = Image.new("RGB", image.size, (255, 255, 255))
        rgb.paste(image, mask=image.split()[3])
    else:
        rgb = image.convert("RGB")
    side = max(rgb.size)
    if side > 0 and rgb.size != (side, side):
        return ImageOps.pad(rgb, (side, side), color=(255, 255, 255))
    return rgb


def classify_category_detailed(
    image: Image.Image,
) -> tuple[str, str, float, dict[str, float]]:
    """Categoria CLIP (6 clases) + subcategoria fina + confianza + probs por clase.

    Evalua un ensemble multi-prompt de synsets naturales por clase en una sola
    pasada CLIP, sumando probabilidades por bloque de categoria y extrayendo el
    synset mas probable dentro de la categoria ganadora.
    """
    clf = get_classifier()
    clip_img = _prepare_for_clip(image)
    clases = list(CLIP_CATEGORIES)

    flat_prompts: list[str] = []
    class_slices: dict[str, tuple[int, int, tuple[tuple[str, str], ...]]] = {}
    cursor = 0
    for c in clases:
        synsets = _CATEGORY_SYNSETS[c]
        flat_prompts.extend(prompt for _sub, prompt in synsets)
        class_slices[c] = (cursor, cursor + len(synsets), synsets)
        cursor += len(synsets)

    probs = ClipClassifier.probs_imagen(
        clf.model, clf.processor, clip_img, flat_prompts, clf.device
    )

    raw_por_clase: dict[str, float] = {}
    for c, (ini, fin, _synsets) in class_slices.items():
        raw_por_clase[c] = sum(probs[ini:fin])

    total = sum(raw_por_clase.values()) or 1.0
    por_clase = {c: raw_por_clase[c] / total for c in clases}
    mejor_clase = max(clases, key=lambda c: por_clase[c])

    ini, fin, synsets = class_slices[mejor_clase]
    class_probs = probs[ini:fin]
    mejor_sub_idx = max(range(len(synsets)), key=lambda i: class_probs[i])
    subcategory = synsets[mejor_sub_idx][0]

    return mejor_clase, subcategory, por_clase[mejor_clase], por_clase


def classify_category(image: Image.Image) -> tuple[str, float, dict[str, float]]:
    """Categoria CLIP + confianza + todas las probabilidades de clase."""
    category, _subcategory, conf, por_clase = classify_category_detailed(image)
    return category, conf, por_clase


def classify_aesthetics(
    image: Image.Image,
    top_n: int = 3,
    confidence_threshold: float | None = None,
) -> list[dict[str, Any]]:
    """Top-N esteticas CLIP con confianza normalizada a 1 sobre el total.

    Fallback a ResNet-50 fine-tuned (86e3122f7):
    Si la confianza de la estética dominante cae bajo el umbral configurado
    (settings.clip_confidence_threshold, default 0.40), se dispara el clasificador
    ResNet-50 de respaldo para mayor robustez ante imágenes ambiguas o atípicas.
    """
    from config import settings

    threshold = confidence_threshold if confidence_threshold is not None else settings.clip_confidence_threshold
    clf = get_classifier()
    clip_img = _prepare_for_clip(image)
    textos = [t.format(c=a) for a in AESTHETICS for t in _AESTHETIC_TEMPLATES]
    probs = ClipClassifier.probs_imagen(clf.model, clf.processor, clip_img, textos, clf.device)
    por_estetica: dict[str, float] = {}
    ancho = len(_AESTHETIC_TEMPLATES)
    for i, aest in enumerate(AESTHETICS):
        por_estetica[aest] = sum(probs[i * ancho : (i + 1) * ancho])
    total = sum(por_estetica.values()) or 1.0
    ordenadas = sorted(por_estetica.items(), key=lambda kv: -kv[1])[:top_n]
    resultado = [{"aesthetic": k, "confidence": round(v / total, 4)} for k, v in ordenadas]

    # Verificar condición de fallback ResNet-50
    top_confidence = resultado[0]["confidence"] if resultado else 0.0
    if settings.resnet_fallback_enabled and top_confidence < threshold:
        from services.garment_analysis.resnet_fallback_classifier import (
            get_resnet_fallback_classifier,
        )
        fallback_clf = get_resnet_fallback_classifier()
        return fallback_clf.classify(image, top_n=top_n)

    return resultado


PATTERNS = ("solid", "striped", "plaid", "floral", "graphic")
_PATTERN_TEMPLATES = (
    "a photo of a {p} clothing item",
    "a clothing fabric with a {p} pattern",
)


def classify_pattern(image: Image.Image) -> str:
    """Clasifica el patron visual de la prenda (zero-shot CLIP)."""
    clf = get_classifier()
    clip_img = _prepare_for_clip(image)
    textos = [t.format(p=p) for p in PATTERNS for t in _PATTERN_TEMPLATES]
    probs = ClipClassifier.probs_imagen(clf.model, clf.processor, clip_img, textos, clf.device)
    por_patron: dict[str, float] = {}
    ancho = len(_PATTERN_TEMPLATES)
    for i, pat in enumerate(PATTERNS):
        por_patron[pat] = sum(probs[i * ancho : (i + 1) * ancho])
    mejor = max(por_patron.items(), key=lambda kv: kv[1])
    return mejor[0]


def analyze_garment(image: Image.Image) -> dict[str, Any]:
    """Analisis completo de una prenda para el MVP.

    Devuelve un dict listo para persistir y para la respuesta de upload:
    category, subcategory, position, top_aesthetics, dominant_colors,
    embedding (CLIP image features), y pattern.
    """
    clf = get_classifier()
    category, subcategory, _conf, _probs = classify_category_detailed(image)
    position = CATEGORY_TO_POSITION.get(category)
    aesthetics = classify_aesthetics(image)
    colors = dominant_colors(image)
    embedding = _image_embedding(clf, image)
    pattern = classify_pattern(image)
    return {
        "category": category,
        "subcategory": subcategory,
        "position": position.value if position else None,
        "top_aesthetics": aesthetics,
        "dominant_colors": colors,
        "embedding": embedding,
        "pattern": pattern,
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

    clip_img = _prepare_for_clip(image)
    entrada = clf.processor(images=clip_img, return_tensors="pt")
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
    adapter = get_aesthetic_adapter()
    if adapter is not None:
        with torch.no_grad():
            proj, _ = adapter(vec.to(dtype=torch.float32, device="cpu"))
            return [round(float(x), 6) for x in proj[0].tolist()]
    return [round(float(x), 6) for x in vec[0].tolist()]
