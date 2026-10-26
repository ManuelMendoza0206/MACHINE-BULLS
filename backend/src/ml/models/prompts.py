"""Prompts estructurados para CLIP zero-shot, por nivel de granularidad.

Archivo aparte del clasificador porque
`openspec/specs/backend/garment-analysis-service/spec.md` §6 separa las dos cosas:
este modulo es el equivalente de `src/services/garment_analysis/prompts.py` que
pide el spec, con la diferencia de la ruta, que ADR 401 explica.

Que el prompt sea una frase y no una palabra suelta es lo que hace viable el
enfoque zero-shot sin fine-tuning inicial (`plan-base.md` 4.1.A): CLIP responde a
como esta redactada la frase, y una palabra suelta pierde esa informacion.

Los templates van separados por nivel porque las clases no se redactan igual:
"bag" y "dress" necesitan frases distintas, y `SUBCATEGORIA` evalua subtipos de
bolso, donde el "bag" va fijo.
"""

from __future__ import annotations

from collections.abc import Sequence

NIVEL_CATEGORIA = "CATEGORIA"
NIVEL_SUBCATEGORIA = "SUBCATEGORIA"
NIVELES = (NIVEL_CATEGORIA, NIVEL_SUBCATEGORIA)

TEMPLATES: dict[str, list[str]] = {
    NIVEL_CATEGORIA: [
        "a photo of a {c}",
        "a studio product photo of a {c}",
        "a product photo of a {c} for sale",
    ],
    NIVEL_SUBCATEGORIA: [
        "a photo of a {c} bag",
        "a studio product photo of a {c} bag",
        "a close-up photo of a {c} bag",
    ],
}


def expandir_prompts(nivel: str, clase: str) -> list[str]:
    """Rellena los templates de un nivel con una clase y devuelve los prompts.

    El orden de `TEMPLATES[nivel]` se preserva porque el eval promedia las
    distribuciones en ese orden para armar el ensemble de tres prompts, y
    compara ese ensemble contra el primero como base.
    """
    if nivel not in TEMPLATES:
        raise KeyError(f"nivel desconocido: {nivel!r}; esperado {list(NIVELES)}")
    clase = clase.strip()
    if not clase:
        raise ValueError("la clase no puede ir vacia: los prompts saldrian 'a photo of a '")
    return [t.format(c=clase) for t in TEMPLATES[nivel]]


def prompts_por_clase(clases: Sequence[str], nivel: str) -> list[list[str]]:
    """Devuelve una lista de prompts por clase, en el mismo orden de `clases`."""
    return [expandir_prompts(nivel, c) for c in clases]


def prompts_planos(clases: Sequence[str], nivel: str) -> list[str]:
    """Aplana los prompts de todas las clases, en orden clase-major.

    Es lo que se pasa al modelo: CLIP recibe una sola lista de textos y devuelve
    una distribucion sobre ella. Para volver a clases hay que promediar por
    bloques, que es lo que hace `slices_por_clase`.
    """
    return [p for grupo in prompts_por_clase(clases, nivel) for p in grupo]


def slices_por_clase(clases: Sequence[str], nivel: str) -> list[slice]:
    """Slice de cada clase dentro de la lista plana de prompts.

    Sin esto no se puede volver de la distribucion sobre prompts a la distribucion
    sobre clases: promediando los prompts de la clase y tomando el argmax por
    clase, no por prompt suelto.
    """
    largo = len(TEMPLATES[nivel])
    return [slice(i * largo, (i + 1) * largo) for i in range(len(clases))]
