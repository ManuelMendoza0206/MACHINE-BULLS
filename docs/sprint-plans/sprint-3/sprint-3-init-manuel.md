# Sprint 3 — Inicialización | Asiento B (Manuel Jiménez Mendoza)

**Rol:** Feature Support — Garment Analysis Service
**Ventana:** 23 sep – 6 oct 2026
**Epic:** `backend/garment-analysis-service`
**Depende de:** `backend/api-gateway` (Huascar, Sprint 2) — confirmar en el kickoff que al
menos el endpoint base de garments mergeó antes de asumirlo como cimiento.

> **Nota de continuidad:** eres Asiento C en Sprint 2 (validas el trabajo de Leonardo/Jaicel de
> Sprint 1) y Asiento B aquí en Sprint 3 — cierra bien esa validación antes del 22-sep para no
> arrastrar dos responsabilidades a medio hacer al mismo tiempo.

---

## 🎯 Objetivo de Sprint

Implementar el servicio de análisis de prenda: remoción de fondo, clasificación de estética
(zero-shot con fallback a fine-tuned), respuesta Top-N con score, y normalización de imagen
consistente con el encoder — el backend que Huascar (Asiento A, `wardrobe-flow`) consume desde
el frontend este mismo sprint.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Confirmar el contrato con Huascar antes de escribir código — 0.5 días

1. Revisa `frontend/src/schemas/api/garments.ts` (ya existe, PR #14) — esa es la forma de
   respuesta que el frontend ya espera. Tu implementación debe producir exactamente eso, no
   una forma "razonable" que luego haya que reconciliar.
2. Reunión de 20 min con Huascar (Tarea 2 de su prompt de Sprint 3) para confirmar el contrato
   antes de que cada uno construya su lado por separado.

**Aceptación:**
- [ ] Contrato confirmado por escrito (comentario en el epic) antes de implementar

---

### Tarea 1: Remoción de fondo — 1 día

**Spec:** `openspec/specs/backend/garment-analysis-service/spec.md` — Requirement "Remoción de
fondo previa a cualquier clasificación".

1. `BackgroundRemover` con `rembg`/U-2-Net, invocado **antes** de cualquier paso de
   clasificación — no clasifiques sobre la imagen con fondo original.
2. Test: imagen con fondo → imagen sin fondo verificable (no solo "no lanza excepción").

**AC:**
- [ ] `BackgroundRemover` implementado, invocado antes del pipeline de clasificación
- [ ] Test con imagen real de fixture, verifica que el fondo se removió
- [ ] PR revisado y mergeado

---

### Tarea 2: Normalización de imagen consistente con el encoder — 0.5 días

**Spec:** Requirement "Normalización de imagen consistente con el encoder".

1. Normalización 224×224 RGB aplicada de forma **idéntica** al pipeline de CLIP y al fallback
   (si el fallback usa un encoder distinto, documenta la diferencia explícitamente, no la
   escondas).

**AC:**
- [ ] Test que verifica las dimensiones y el espacio de color exactos antes de pasar al
      clasificador
- [ ] PR revisado y mergeado (puede ir junto con la Tarea 1)

---

### Tarea 3: Clasificación zero-shot con fallback a fine-tuned — 2 días

**Spec:** Requirement "Clasificación zero-shot con fallback a modelo fine-tuned".

1. `AestheticClassifier` (CLIP zero-shot) con prompts estructurados — documenta los prompts
   usados, son parte del contrato de calidad, no un detalle de implementación descartable.
2. Fallback a modelo fine-tuned cuando corresponda (define el criterio de "cuándo" — confianza
   baja del zero-shot, o siempre que exista un fine-tuned disponible; regístralo en el PR).
3. Coordina con Leonardo/Jaicel (dueños de los epics de ML en `Data`) sobre qué modelo
   fine-tuned está realmente disponible — a hoy (17-sep) no hay ninguno en producción según el
   registro de modelos de Leonardo (`docs/ml/MODEL_REGISTRY.md`, Sprint 2). Si no hay
   fine-tuned disponible todavía, el fallback puede no tener a qué caer — documenta esto como
   riesgo, no lo simules con un modelo que no existe.

**AC:**
- [ ] `AestheticClassifier` zero-shot funcional, prompts documentados
- [ ] Criterio de fallback definido y testeado (aunque el modelo fine-tuned real no exista
      aún — el criterio y el path de código sí deben estar listos)
- [ ] Riesgo de "no hay fine-tuned disponible" registrado en `docs/risks/RISK-REGISTER.md` si
      aplica
- [ ] PR revisado y mergeado

---

### Tarea 4: Respuesta Top-N con score — 1 día

**Spec:** Requirement "Respuesta Top-N con score, nunca un valor único absoluto".

1. La respuesta expone `top_aesthetics` como lista ordenada con ≥1 elemento y su score — nunca
   un único valor "la estética es X" sin alternativas ni confianza.
2. Coincide exactamente con el schema Zod (`garments.ts`) que Huascar ya consume en el
   frontend — verificar contra la Tarea 0.

**AC:**
- [ ] Endpoint responde `top_aesthetics: [{aesthetic, score}]`, ordenado descendente
- [ ] Test verifica que nunca responde con un único valor plano
- [ ] Contrato verificado end-to-end con el frontend de Huascar (pair, no solo revisión de
      schema en papel)
- [ ] PR revisado y mergeado

---

## ⏱️ Cronograma (23 sep – 6 oct, 14 días)

| Días | Fechas | Tarea |
|---|---|---|
| 1 | 23 sep | Tarea 0 (contrato con Huascar) |
| 2-3 | 24-25 sep | Tarea 1 + Tarea 2 (remoción de fondo + normalización) |
| 4-7 | 26-29 sep | Tarea 3 (clasificación zero-shot + fallback) |
| 8-9 | 30 sep - 1 oct | Tarea 4 (respuesta Top-N) |
| 10-14 | 2-6 oct | Integración end-to-end con Huascar, buffer |

---

## ✅ Definition of Done

- [ ] `pytest backend/tests/ -v --cov=src` en los módulos de `garment-analysis-service`
- [ ] Los 4 Requirements de la spec cubiertos por test
- [ ] Contrato de respuesta verificado contra el schema Zod del frontend, no solo "debería
      coincidir"
- [ ] Riesgo de fine-tuned no disponible registrado si aplica
- [ ] Epic movido a `complete` en ClickUp con evidencia — no repetir el patrón de Sprint 1

---

## 🤝 Pair Sessions

- **Tarea 0 y Tarea 4:** Huascar — el contrato se confirma dos veces, al inicio y al final.
- **Tarea 3:** Leonardo/Jaicel — disponibilidad real de modelos fine-tuned.
- Termina tu validación de Sprint 2 (Asiento C, `sprint-2-init-manuel.md`) antes del 22-sep —
  no la dejes a medias por arrancar este epic antes de tiempo.
