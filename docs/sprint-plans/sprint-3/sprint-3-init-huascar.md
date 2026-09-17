# Sprint 3 — Inicialización | Asiento A (Huascar Camilo Durán Avendaño)

**Rol:** Feature Lead — Wardrobe Flow
**Ventana:** 23 sep – 6 oct 2026
**Epic:** `frontend/wardrobe-flow`
**Depende de:** Q5 (Jaicel, Asiento D este sprint) — diseño de consentimiento/retención de
fotos, coordinar en los primeros 2 días, no construir a ciegas sobre un supuesto.

> **Verifica antes de arrancar:** este prompt se escribió el 17-sep, antes del cierre de
> Sprint 2. Antes de tomar la Tarea 0, confirma contra `main` real del 23-sep que lo listado en
> "punto de partida" sigue siendo cierto.

---

## 🎯 Objetivo de Sprint

Cerrar el flujo de guardarropa: subida por lote de prendas con techo de concurrencia, resultado
de análisis editable antes de confirmar, y el catálogo cápsula con cobertura mínima verificable
desde el lado del frontend.

**Punto de partida real (no desde cero):** tu propio PR #10 (16-sep, Sprint 1 adelantado) ya
trajo `frontend/src/lib/vision/{detectBlur,laplacianVariance,decodeImage}.ts`,
`frontend/src/stores/onboardingStore.ts`, y `frontend/src/features/garments/lib/uploadQueue.ts`.
Este sprint es sobre construir la UI y el flujo completo encima de esa base, no repetirla.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Inventario + coordinación de Q5 — 0.5 días

1. `cd frontend && npm run test -- --coverage` — confirma qué de `uploadQueue`/`detectBlur`
   tiene test hoy y qué cobertura real tiene (no asumas que "ya existe" = "ya probado").
2. Reunión de 30 min con Jaicel (Q5): ¿qué política de consentimiento/retención de fotos existe
   ya, aunque sea en borrador? Si no hay nada todavía, acuerden un mínimo viable para no
   bloquear tu Tarea 1 (ej.: "se pide consentimiento explícito antes de la primera subida, se
   retiene la foto solo mientras la prenda esté activa en el guardarropa").

**Aceptación:**
- [ ] Inventario de cobertura de `uploadQueue`/`detectBlur`/`onboardingStore`
- [ ] Acuerdo mínimo de consentimiento con Jaicel, documentado en el comentario del epic

---

### Tarea 1: Subida por lote con techo de concurrencia — 2 días

**Spec:** `openspec/specs/frontend/wardrobe-flow/spec.md` — Requirement "Subida por lote con
techo de concurrencia".

> **Reusa, no reescribas:** Leonardo dejó un scaffold `test.skip` en
> `tests/e2e/wardrobe-upload.spec.ts` (Sprint 2, Q1) con los pasos esperados de este flujo.
> Quita el `skip` y complétalo cuando la UI esté lista — no escribas un E2E nuevo desde cero.

1. UI de selección múltiple de imágenes (`<input type="file" multiple>` o drag-and-drop) que
   alimenta `uploadQueue` (ya existe) respetando su techo de concurrencia — no lances N
   requests simultáneas sin límite.
2. Cada imagen pasa por `detectBlur` (ya existe) **antes** de subirse — rechaza/advierte sobre
   fotos borrosas sin gastar la llamada de red.
3. Muestra el consentimiento acordado con Jaicel (Tarea 0) antes de la primera subida de la
   sesión — un checkbox o modal explícito, no un texto perdido en el footer.
4. Estados de UI: subiendo / completado / error por cada ítem del lote — no un spinner único
   que oculte cuál falló.

**AC:**
- [ ] Lote de N imágenes respeta el techo de concurrencia de `uploadQueue` (verificable con
      test: N requests simultáneas máximo, el resto en cola)
- [ ] Imagen borrosa rechazada antes de la llamada de red, con mensaje claro
- [ ] Consentimiento mostrado antes de la primera subida, persistido para no repetirlo cada vez
- [ ] Tests de integración (RTL) del componente de subida
- [ ] PR revisado y mergeado

---

### Tarea 2: Resultado de análisis editable antes de confirmar — 1.5 días

**Spec:** `wardrobe-flow/spec.md` — Requirement "Resultado de análisis editable antes de
confirmar".

1. Tras la subida, el resultado del análisis (categoría, estética detectada) se muestra en un
   formulario editable — el usuario puede corregir antes de guardar, la IA no impone el
   resultado como definitivo.
2. Usa los schemas de `frontend/src/schemas/api/garments.ts` (ya existen del PR #14 de Jaicel)
   para tipar la respuesta — no inventes un tipo paralelo.
3. Si el endpoint real del backend (`garment-analysis-service`, epic de Manuel este sprint)
   todavía no está listo, mockea con `frontend/tests/fixtures/api/garmentUploadResponse.json`
   (ya existe) y coordina con Manuel el contrato exacto antes de que él lo implemente distinto.

**AC:**
- [ ] Formulario de edición post-análisis, usando el schema Zod existente
- [ ] Guardar sin editar = acepta el resultado de IA tal cual; editar = el valor del usuario
      prevalece
- [ ] Test de integración cubre ambos caminos
- [ ] PR revisado y mergeado

---

### Tarea 3: Catálogo cápsula — cobertura mínima verificable (frontend) — 1.5 días

**Spec:** `wardrobe-flow/spec.md` — Requirement "Catálogo cápsula con cobertura mínima
verificable"; coordina con el seed de Huascar... espera, **tú mismo** hiciste el seed del
catálogo cápsula en el backend en Sprint 2 (tu propio prompt de `sprint-2-init-huascar.md`,
Tarea 1) — este es el lado frontend de lo mismo, consume esa data, no la reinventes.

1. Vista del catálogo cápsula compartido — el usuario ve qué prendas cápsula existen y puede
   "adoptar" una a su guardarropa (endpoint `POST /garments/capsule/{id}/adopt`, gap G4 de
   `api-contract-gaps/spec.md` — confirma si Huascar/Manuel ya lo expusieron en el gateway).
2. Si el endpoint no está listo, documenta el bloqueo explícitamente — no construyas la UI
   contra un endpoint que no existe sin dejarlo anotado como dependencia externa.

**AC:**
- [ ] Vista de catálogo cápsula, con estado de carga/error explícito si el endpoint no responde
- [ ] Si el endpoint de adopción no está listo: bloqueo documentado en el epic, no una feature
      a medias sin explicación
- [ ] PR revisado y mergeado

---

## ⏱️ Cronograma (23 sep – 6 oct, 14 días)

| Días | Fechas | Tarea |
|---|---|---|
| 1 | 23 sep | Tarea 0 (inventario + Q5 con Jaicel) |
| 2-4 | 24-26 sep | Tarea 1 (subida por lote) |
| 5-7 | 27-29 sep | Tarea 2 (resultado editable) |
| 8-9 | 30 sep - 1 oct | Tarea 3 (catálogo cápsula) |
| 10-14 | 2-6 oct | Buffer, review, ajustes de la validación de Leonardo (epics de Sprint 2) |

---

## ✅ Definition of Done

- [ ] `npm run typecheck && npm run lint && npm run test && npm run test:e2e && npm run build`
      (en `frontend/`) — todos exit 0
- [ ] Los 3 Requirements de `wardrobe-flow/spec.md` cubiertos por test
- [ ] Consentimiento de fotos implementado según lo acordado con Jaicel, no un supuesto propio
- [ ] Epic movido a `complete` en ClickUp con link de PR — no dejarlo en `to do` como pasó en
      Sprint 1 (ver `sprint-3-manifest.md` §3)
- [ ] Handoff dejado para quien valide este epic en Sprint 4

---

## 🤝 Pair Sessions

- **Tarea 0:** Jaicel (Q5, consentimiento) — 30 min, día 1, no negociable.
- **Tarea 2:** Manuel (`garment-analysis-service`) — confirmar contrato de respuesta antes de
  que cada uno implemente su lado por separado.
- **Tarea 3:** verificar con Huascar-de-Sprint-2 (o sea, releer tu propio prompt de Sprint 2)
  el detalle exacto del seed del catálogo cápsula.
