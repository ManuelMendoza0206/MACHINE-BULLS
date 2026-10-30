"""Extraccion de colores dominantes en HSV (B2).

Solo PIL + numpy: sin torch ni cv2, asi corre en CI y en la laptop de cualquiera
del equipo. El pipeline convierte a HSV, filtra casi-blancos y casi-negros (que
dominan las fotos de producto con fondo blanco y arruinan la armonia
cromatica), y agrupa por cuantizacion de canal H/S/V para devolver los colores
con mas masa.

El contrato del frontend exige h en [0,360], s/v en [0,100] y hex #rrggbb
(`schemas/api/garments.ts`); `a_color` normaliza exactamente a eso.
"""

from __future__ import annotations

import colorsys
from typing import Any

import numpy as np
from PIL import Image


def _a_color(rgb: np.ndarray, masa: float) -> dict[str, Any]:
    """Convierte un RGB uint8 en el dict {h,s,v,hex} que valida el Zod."""
    r, g, b = (int(c) for c in rgb)
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    return {
        "h": round(h * 360.0, 1),
        "s": round(s * 100.0, 1),
        "v": round(v * 100.0, 1),
        "hex": f"#{r:02x}{g:02x}{b:02x}",
        "mass": round(float(masa), 4),
    }


def _es_neutro_extremo(h: float, s: float, v: float) -> bool:
    """Descarta blanco/negro/gris casi puro.

    En una foto de producto el fondo suele ser blanco y ocupa >50% de pixeles.
    Sin este filtro el color "dominante" de una camiseta negra seria el fondo
    blanco, y dos prendas con fondos distintos parecerian incompatibles.
    """
    return (s < 0.08 and v > 0.95) or (v < 0.05)


def dominant_colors(image: Image.Image, max_colors: int = 3) -> list[dict[str, Any]]:
    """Devuelve hasta `max_colors` colores dominantes, ordenados por masa.

    Cuantiza cada canal a 16 bins y cuenta pixeles por celda combinada
    (bin_h, bin_s, bin_v). Es mas barato que k-means y determinista, que para
    el score de armonia importa mas que la precision fina.
    """
    img = image.convert("RGB")
    # Bajar resolucion: 128px por lado alcanza para proporciones de color y
    # baja el costo de la cuenta de pixeles de ~10M a ~16k celdas.
    img.thumbnail((128, 128))
    arr = np.asarray(img, dtype=np.float32) / 255.0

    hsv = np.asarray(
        [colorsys.rgb_to_hsv(*pixel) for pixel in arr.reshape(-1, 3)],
        dtype=np.float32,
    ).reshape(arr.shape)

    # Todo flat desde aca: hsv viene (H,W,3) y los masks/filtros tienen que
    # indexar el mismo eje plano que `arr.reshape(-1, 3)`.
    pixeles = arr.reshape(-1, 3)
    hsv_pix = hsv.reshape(-1, 3)
    ss, vs = hsv_pix[:, 1], hsv_pix[:, 2]
    filtro = ~((ss < 0.08) & (vs > 0.95)) & (vs >= 0.05)
    if not filtro.any():
        # Imagen completamente neutra (todo blanco/negro): devolvemos el color
        # promedio crudo en vez de una lista vacia (el Zod exige min 1).
        rgb_prom = (pixeles.mean(axis=0) * 255).astype(np.uint8)
        return [_a_color(rgb_prom, 1.0)]

    pixeles = pixeles[filtro]
    hsv_pix = hsv_pix[filtro]

    # 16 bins por canal: cuantizacion gruesa pero estable entre corridas.
    bins = np.clip((hsv_pix * np.array([16.0, 16.0, 16.0])).astype(np.int32), 0, 15)
    claves = bins[:, 0] * 256 + bins[:, 1] * 16 + bins[:, 2]
    unicas, conteos = np.unique(claves, return_counts=True)

    orden = np.argsort(-conteos)[: max_colors * 3]
    resultado: list[dict[str, Any]] = []
    total = float(conteos.sum())
    for idx in orden:
        clave = int(unicas[idx])
        mascara = claves == clave
        rgb_medio = (pixeles[mascara].mean(axis=0) * 255).astype(np.uint8)
        color = _a_color(rgb_medio, conteos[idx] / total)
        # Normaliza H de vuelta a [0,1] para comparar la distancia con colores
        # ya guardados; el dict expuesto va con h en grados (contrato Zod).
        if _distancia_hue_minima(resultado, color) < 15.0:
            continue
        resultado.append(color)
        if len(resultado) >= max_colors:
            break
    return resultado


def _distancia_hue_minima(existentes: list[dict[str, Any]], nuevo: dict[str, Any]) -> float:
    """Distancia minima en grados de hue contra la lista, circular en 360."""
    if not existentes:
        return 360.0
    dists = []
    for otro in existentes:
        d = abs(nuevo["h"] - otro["h"])
        dists.append(min(d, 360.0 - d))
    return min(dists)
