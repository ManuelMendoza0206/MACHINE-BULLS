# ADR 005 — Clasificación de estética: CLIP zero-shot con umbral

Estado: aceptado
Fecha: 2026-08-26

## Contexto

Las estéticas objetivo son old money, streetwear, soft boy, starboy y gorpcore. Los datasets públicos como DeepFashion2 etiquetan categoría funcional pero no esta taxonomía. Contamos con unas 300 imágenes por estética para pruebas.

## Decision

Clasificamos con CLIP preentrenado en modo zero-shot. Cada estética se representa con descripciones de texto estructuradas y se calcula la similitud coseno entre imagen y texto. Fijamos un umbral de 0.60. Por debajo de ese valor activamos un fallback a metadatos de la prenda en lugar de forzar una predicción de baja confianza.

## Alternativas

El ajuste fino supervisado de CLIP queda descartado porque exige miles de imágenes etiquetadas por estilistas que no tenemos. Entrenar una CNN dedicada para estética queda descartado por el mismo motivo y por el tiempo adicional de curación.

## Consecuencias

Obtenemos clasificación inmediata sin etiquetado masivo. La precisión depende de la calidad del prompt de texto y el umbral evita alucinaciones visuales. El documento oficial no exige CLIP ni umbral específico, por lo que este criterio es decisión interna del equipo y se revisa con más datos.

