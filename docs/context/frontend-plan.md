# StyleMe — Planteamiento Integral del Frontend

Documento exclusivo de planificación de producto, UX y diseño conceptual para el frontend de **StyleMe**, derivado en su totalidad de `docs/base-plan.MD`. Este documento precede a las specs técnicas SDD en `/specs/` — define **qué** se construye y **por qué**, antes de que las specs definan **cómo** (contratos, tipos, tests).

> Referencias cruzadas al documento base: cada sección cita el apartado de `base-plan.MD` del que se deriva, para trazabilidad total. Nada aquí introduce alcance no presente en el documento base salvo decisiones de UX/UI explícitamente marcadas como **[Decisión de diseño]**.

---

## 1. Personalidad de Marca y Principios de Diseño

**Origen:** §1.2, §3.2 — "estéticas urbanas y conceptuales bien definidas (Old Money, Streetwear, Soft Boy, Starboy, Gorpcore)", "quiet luxury", eliminar "fatiga de decisión".

### 1.1 Personalidad

StyleMe se dirige a hombres jóvenes con conciencia estética pero sin vocabulario técnico de moda. La interfaz debe sentirse como un **asistente de estilo experto y discreto**, no como una app gamificada ni un e-commerce ruidoso. Referencia de tono: la app es la prenda misma — minimalista, bien cortada, sin adornos innecesarios.

| Atributo | Se traduce en... | Se evita... |
| :--- | :--- | :--- |
| **Confianza silenciosa** (quiet confidence) | Paleta neutra, tipografía sobria, jerarquía clara | Gradientes llamativos, saturación alta en UI, iconos decorativos sin función |
| **Image-forward** | La prenda/outfit/foto del usuario es siempre el elemento de mayor peso visual; el chrome de UI se retrae | Cards sobrecargadas de metadata visible simultáneamente |
| **Precisión editorial** | Grids alineados a una retícula estricta, espaciado generoso (whitespace como herramienta de foco) | Densidad de información tipo dashboard |
| **Transparencia técnica** | Mostrar *por qué* se recomienda algo (score, confianza) sin abrumar — progressive disclosure | Cajas negras ("confía en el algoritmo") o sobre-explicación por defecto |

### 1.2 Principios de UX (derivados de §3.1, §8)

1. **Fricción cero en el onboarding** — §3.1.3 identifica el alta de datos como causa de abandono. El flujo debe permitir valor perceptible en <60s (catálogo cápsula) antes de pedir esfuerzo (fotografiar el armario propio).
2. **Honestidad sobre el tiempo de espera** — §8 documenta que el VTON puede tardar >15s. Ninguna espera async se presenta como un spinner mudo; siempre hay tiempo estimado, contexto de qué está pasando, y la posibilidad de abandonar la pantalla sin perder el resultado.
3. **Confianza mediante explicabilidad, no perfección** — §8 documenta baja precisión posible en estéticas ambiguas y exige respuesta Top-N con score en vez de un valor único. La UI debe mostrar siempre confianza/alternativas, nunca fingir certeza absoluta.
4. **Mobile-first estricto** — el caso de uso ("¿qué me pongo hoy") ocurre mayormente en el celular, por la mañana, con poca luz y poca paciencia. Todo flujo crítico debe ser completable con el pulgar, en una mano.
5. **Prevención antes que error** — §8 señala fotos de baja calidad como riesgo alto/medio. La validación (blur, encuadre) ocurre en el cliente, antes del submit, no después de que el backend rechace.

---

## 2. Arquitectura de Información y Mapa de Navegación

**Origen:** §10 (entidades), §11 (endpoints), §7.1 (fases → entregables).

### 2.1 Navegación global (autenticado)

```
┌──────────────────────────────────────────────────────────┐
│  StyleMe            Armario   Outfits   Try-On    (👤)    │  ← Desktop: top nav
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│                                                            │
│                    (contenido de pantalla)                │
│                                                            │
├──────────────────────────────────────────────────────────┤
│   [Armario]     [Outfits]     [Try-On]      [Perfil]      │  ← Mobile: bottom tab bar
└──────────────────────────────────────────────────────────┘
```

**[Decisión de diseño]** 4 secciones raíz, sin más — el documento base define exactamente 3 dominios funcionales (Garments, Outfits, VTON) + 1 identidad (User). No se introduce una quinta sección para no diluir el foco.

### 2.2 Mapa de rutas (Next.js App Router)

```
/                                   Landing (no autenticado)
/login, /signup                     Auth
/onboarding                         Wizard de primer uso (una sola vez por usuario)
/wardrobe                           Armario — grid de Garments del usuario
/wardrobe/upload                    Subida por lote de prendas
/wardrobe/[garmentId]                Detalle de una prenda (análisis, edición de categoría)
/wardrobe/capsule                   Catálogo público "Básicos StyleMe" (50 prendas)
/outfits                            Recomendaciones generadas — grid de Outfits
/outfits/[outfitId]                  Detalle de outfit (prendas, breakdown de score)
/try-on                             Selección de foto + outfit → inicia VTONJob
/try-on/jobs/[jobId]                 Estado/resultado de un VTONJob (polling)
/try-on/history                     Historial de resultados VTON del usuario
/profile                            Perfil, preferencias de estética, cierre de sesión
```

### 2.3 Jerarquía de entidades → pantallas

Mapeo directo desde §10.1:

| Entidad (backend) | Pantallas que la consumen |
| :--- | :--- |
| `User` | `/login`, `/signup`, `/profile` |
| `Garment` | `/wardrobe`, `/wardrobe/upload`, `/wardrobe/[garmentId]`, `/wardrobe/capsule` |
| `Outfit` + `OutfitGarment` | `/outfits`, `/outfits/[outfitId]` |
| `VTONJob` | `/try-on`, `/try-on/jobs/[jobId]`, `/try-on/history` |

---

## 3. Flujos de Usuario Detallados

### 3.1 Flujo A — Onboarding y digitalización del guardarropa

**Origen:** §3.1.3, §3.2, §5.2 (Catálogo "Básicos StyleMe"), `POST /api/v1/garments/upload`.

**Objetivo de UX:** el usuario llega a ver su primer outfit recomendado en el menor número de pasos posible, sin exigirle fotografiar nada si no quiere.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────────┐
│  Landing    │ --> │ Signup / Login   │ --> │ Onboarding — Paso 1/2   │
│  (hero,     │     │ (email + pass o  │     │ "¿Cuál es tu estilo?"   │
│  propuesta  │     │  OAuth futuro)   │     │ Selección opcional de   │
│  de valor)  │     │                  │     │ estética objetivo (chips│
└─────────────┘     └──────────────────┘     │ multi-select, skippable)│
                                              └────────────┬────────────┘
                                                            │
                                                            v
                                      ┌─────────────────────────────────────┐
                                      │ Onboarding — Paso 2/2               │
                                      │ "Arma tu armario"                   │
                                      │  ┌───────────────┐ ┌──────────────┐ │
                                      │  │ Subir mis      │ │ Empezar con  │ │
                                      │  │ prendas (batch)│ │ Básicos      │ │
                                      │  │                │ │ StyleMe      │ │
                                      │  └───────┬────────┘ └──────┬───────┘ │
                                      └──────────┼──────────────────┼────────┘
                                                 │                  │
                                  (drag&drop N imgs)      (grid de 50 prendas,
                                                 │          selección múltiple,
                                                 v          sin análisis — ya
                                   Por cada imagen:         etiquetadas)
                                   POST /garments/upload             │
                                   → estado "analizando" (skeleton)  │
                                   → resultado editable              │
                                                 │                  │
                                                 └────────┬─────────┘
                                                          v
                                          ┌───────────────────────────┐
                                          │ Confirmación: "Tu armario  │
                                          │  tiene N prendas"          │
                                          │  Grid de revisión rápida   │
                                          │  CTA: "Ver mis primeros    │
                                          │  outfits" → /outfits       │
                                          └───────────────────────────┘
```

Ambas ramas (subida propia / catálogo cápsula) son **no excluyentes**: el usuario puede combinar ambas en el mismo onboarding, y siempre puede volver a `/wardrobe/upload` o `/wardrobe/capsule` después. Esto responde directamente a §3.2 ("armario cápsula para reducir la fricción inicial").

### 3.2 Flujo B — Subida y análisis de una prenda

**Origen:** §4.1 (pipeline clasificador+estética), §11.1 (`POST /api/v1/garments/upload`), §8 (riesgo de fotos de baja calidad, baja confianza en estéticas ambiguas).

```
1. SELECCIÓN                2. VALIDACIÓN CLIENTE        3. SUBIDA + ANÁLISIS
┌─────────────────┐         ┌─────────────────┐          ┌─────────────────┐
│ Dropzone / cámara│  --->  │ Chequeo local:   │  --->    │ POST upload      │
│ (multi-file en   │        │ tamaño, formato, │          │ Estado: skeleton │
│  batch permitido) │        │ heurística de    │          │ card + shimmer   │
│                  │        │ blur (Laplacian  │          │ "Analizando tu   │
│                  │        │ variance en      │          │ prenda..."       │
│                  │        │ canvas, liviano) │          └────────┬─────────┘
└─────────────────┘        └────────┬─────────┘                   │
                                     │ (si falla)                  v
                             ┌───────v─────────┐         ┌─────────────────────┐
                             │ Aviso inline:    │         │ 4. RESULTADO         │
                             │ "Foto borrosa,   │         │ Card con:            │
                             │ ¿tomar otra?"    │         │ - Imagen procesada    │
                             │ (no bloqueante,  │         │   (fondo removido)    │
                             │ el usuario decide│         │ - Categoría detectada │
                             │ si insiste)      │         │   (editable, dropdown)│
                             └──────────────────┘         │ - Top-3 estéticas con │
                                                           │   barra de confianza  │
                                                           │ - Swatches de colores │
                                                           │   dominantes (HSV)    │
                                                           │ CTA: "Guardar en mi   │
                                                           │  armario" / "Reintentar│
                                                           └───────────────────────┘
```

**[Decisión de diseño]** La categoría y la estética detectadas son siempre **editables inline** antes de guardar. El documento base fija F1 > 0.82 (categoría) y F1 > 0.75 (estética) como objetivo, lo que implica ~1 de cada 5-8 clasificaciones de estética será incorrecta — la UI trata esto como flujo normal, no como caso excepcional.

### 3.3 Flujo C — Recomendación de outfits

**Origen:** §4.2, §11.2 (`POST /api/v1/outfits/recommend`).

```
┌────────────────────┐      ┌──────────────────────┐      ┌───────────────────────────┐
│ /outfits            │ ---> │ Loading state:        │ ---> │ Grid de Outfit Cards        │
│ Barra de filtros:   │      │ 3-4 skeleton cards     │      │ (2 col mobile / 3-4 desktop)│
│ - Estética objetivo │      │ con shimmer            │      │ Cada card:                  │
│  (chip select,      │      │ (respuesta síncrona,   │      │  - Collage de las prendas   │
│   opcional)         │      │  se espera <2s)        │      │    componentes (top+bottom+ │
│ - "Solo con mis     │      └────────────────────────┘      │    footwear[+outerwear])    │
│   prendas             │                                    │  - Badge de estética         │
│   disponibles"       │                                    │  - Score cromático (icono +  │
│ (toggle)             │                                    │    valor, ej. "92% armonía") │
└──────────────────────┘                                    │  Tap → detalle               │
                                                              └──────────┬──────────────────┘
                                                                          │
                                                                          v
                                                    ┌─────────────────────────────────────┐
                                                    │ /outfits/[id] — Detalle               │
                                                    │  Imagen grande del outfit combinado   │
                                                    │  Lista de prendas (top/bottom/        │
                                                    │  footwear/outerwear) con thumbnail    │
                                                    │  Breakdown expandible ("¿por qué      │
                                                    │  este outfit?"):                       │
                                                    │   - Armonía cromática (regla aplicada: │
                                                    │     análogos/complementarios/triada)   │
                                                    │   - Similitud de estética              │
                                                    │  CTA primario: "Probar este outfit"    │
                                                    │  → /try-on (outfit preseleccionado)    │
                                                    └────────────────────────────────────────┘
```

**Estado vacío:** si el usuario no tiene suficientes prendas para generar combinaciones (ej. le falta calzado), la pantalla no muestra un grid vacío genérico — indica explícitamente qué categoría falta y enlaza a `/wardrobe/upload` o `/wardrobe/capsule` filtrado por esa categoría.

### 3.4 Flujo D — Probador Virtual (VTON) — el flujo más crítico

**Origen:** §4.3, §11.3-11.4, §8 (latencia >15s, costo de inferencia GPU, caché de resultados).

Este es el único flujo **asíncrono** del producto y el que concentra el mayor riesgo de UX (abandono por espera). Se diseña en 3 etapas explícitas, nunca como una sola pantalla de carga.

```
ETAPA 1 — SETUP (síncrono, instantáneo)
┌───────────────────────────────────────────────────┐
│ /try-on                                             │
│  Outfit seleccionado (preview compacto, cambiable)  │
│  Foto de usuario:                                    │
│   [ Tomar foto ]   [ Subir de galería ]              │
│  Validación cliente: blur check + guía de encuadre   │
│  ("Recomendado: cuerpo completo, fondo simple, luz   │
│  frontal") — overlay guía tipo silueta al usar cámara│
│  CTA: "Generar prueba virtual"                        │
└──────────────────────┬──────────────────────────────┘
                        v  POST /vton/try-on
ETAPA 2 — PROCESAMIENTO (asíncrono, polling)
┌───────────────────────────────────────────────────┐
│ /try-on/jobs/[jobId]                                │
│  Estado: PENDING → PROCESSING                        │
│  UI: ilustración/animación sutil (no spinner genérico│
│  de "cargando app") + barra de progreso indeterminada│
│  Texto dinámico por fase estimada:                    │
│   "Analizando tu pose..." → "Ajustando la prenda..." │
│   → "Renderizando resultado final..."                │
│  Tiempo estimado visible: "~{estimated_time_seconds}s"│
│  Botón secundario: "Te avisamos cuando esté listo —   │
│  puedes seguir usando la app" → navega libremente,    │
│  el polling continúa en background (TanStack Query    │
│  refetchInterval) + badge de notificación en tab-bar  │
└──────────────────────┬──────────────────────────────┘
                        v  GET /vton/status/{job_id} (polling con backoff)
ETAPA 3a — RESULTADO (COMPLETED)          ETAPA 3b — FALLO (FAILED)
┌────────────────────────────┐            ┌────────────────────────────────┐
│ Comparación side-by-side:   │            │ Mensaje honesto y accionable:   │
│  [Foto original] [Resultado]│            │ "No pudimos generar tu prueba   │
│  (slider interactivo tipo   │            │  virtual" + error_message si es │
│  before/after)              │            │  legible para el usuario final  │
│  Acciones: Guardar / Compartir│           │ CTA: "Reintentar" / "Elegir otra│
│  / Probar otro outfit con    │            │  foto"                          │
│  la misma foto                │           └────────────────────────────────┘
└────────────────────────────┘
```

**Estrategia de polling [Decisión de diseño]:** intervalo inicial 2s, backoff exponencial suave hasta un techo de 8s, timeout duro configurable (ej. 90s) que dispara `VTONJobTimeoutError` (ver `CLAUDE.md` §5) sin perder el `job_id` — el usuario puede seguir consultando manualmente desde `/try-on/history`, ya que el job puede completarse en el backend después del timeout de UI.

**Reuso de resultados [Decisión de diseño]:** dado que §8 marca el costo de GPU como riesgo alto y el backend cachea combinaciones repetidas, la UI debe evitar reenviar un mismo par (foto, outfit) — si ya existe un `VTONJob` completado para esa combinación, se navega directo al resultado cacheado en vez de crear un job nuevo.

---

## 4. Inventario Detallado de Pantallas

Para cada pantalla: propósito, estados (loading/empty/error/success), componentes clave, endpoint(s) consumido(s).

### 4.1 `/` — Landing
- **Propósito:** comunicar propuesta de valor en <5s de lectura, conversión a signup.
- **Componentes:** Hero con imagen editorial (outfit + resultado VTON como prueba de concepto), 3 bloques de propuesta de valor (Digitaliza → Recibe combinaciones → Pruébatelo), CTA persistente.
- **Estados:** único (estático, Server Component, sin fetch de datos de usuario).

### 4.2 `/onboarding`
- Ver §3.1. Componente clave: `Stepper` (2 pasos), persistencia de progreso en `sessionStorage`/Zustand para no perder selección si el usuario recarga.

### 4.3 `/wardrobe`
- **Propósito:** vista maestra del armario digitalizado.
- **Estados:**
  - *Empty:* ilustración + CTA dual (subir / catálogo cápsula), igual que onboarding paso 2.
  - *Loading:* skeleton grid.
  - *Success:* grid de `GarmentCard` (imagen procesada, categoría, badge de estética dominante), filtros por categoría (chips: camisa, pantalón, calzado, outerwear) y por estética.
  - *Error:* estado de error de red con reintento (`ApiError`/`NetworkError`).
- **Endpoint:** listado de garments del usuario (implícito en §10, no explicitado como endpoint propio en §11 — **marcar como gap a validar con backend**, ver §7).

### 4.4 `/wardrobe/upload`
- Ver §3.2. Soporta drag&drop múltiple, cada archivo es una `GarmentCard` independiente con su propio estado de análisis (paralelo, no bloqueante entre sí).

### 4.5 `/wardrobe/[garmentId]`
- **Propósito:** detalle + edición de una prenda ya guardada (corregir categoría/estética manualmente, eliminar).
- **Componentes:** imagen grande, metadata editable, historial de uso en outfits (opcional, futuro).

### 4.6 `/wardrobe/capsule`
- **Propósito:** explorar el catálogo público de 50 prendas (§5.2).
- **Componentes:** grid filtrable, selección múltiple con contador flotante ("12 prendas seleccionadas"), botón flotante "Agregar a mi armario".

### 4.7 `/outfits` y `/outfits/[outfitId]`
- Ver §3.3.

### 4.8 `/try-on`, `/try-on/jobs/[jobId]`, `/try-on/history`
- Ver §3.4. `/try-on/history` es una galería tipo grid de resultados pasados (`VTONJob` con `status=completed`), reutilizable como input rápido para "probar otro outfit con esta misma foto".

### 4.9 `/profile`
- **Propósito:** datos de `User`, preferencia de estética por defecto (usada para prefiltrar `/outfits`), cierre de sesión.

---

## 5. Sistema de Diseño

**[Decisión de diseño]** — no especificado en `base-plan.MD` (solo indica "Tailwind CSS"), se define aquí para asegurar consistencia con la personalidad de §1.

### 5.1 Paleta de color

La paleta de **producto** debe ser deliberadamente neutra: las prendas y sus colores (analizados en HSV/CIELAB por el motor de recomendación) son el contenido — la UI no debe competir visualmente con ellos.

| Token | Uso | Light | Dark |
| :--- | :--- | :--- | :--- |
| `background` | Fondo base | `#FAFAF9` (warm off-white) | `#0C0C0D` |
| `foreground` | Texto principal | `#18181B` | `#F4F4F5` |
| `muted` | Fondos secundarios, cards | `#F1F0EE` | `#1A1A1C` |
| `muted-foreground` | Texto secundario | `#71717A` | `#A1A1AA` |
| `border` | Bordes, separadores | `#E4E4E7` | `#27272A` |
| `accent` (marca) | CTAs primarios, foco | `#1C1C1E` (casi negro, no color saturado) | `#F4F4F5` |
| `success` | Confianza alta, completado | `#16A34A` | `#22C55E` |
| `warning` | Confianza media, blur detectado | `#D97706` | `#F59E0B` |
| `destructive` | Error, fallo de job | `#DC2626` | `#EF4444` |

Justificación: un `accent` casi-monocromático (en vez de un color de marca saturado) refuerza "quiet confidence" (§1.1) y evita chocar con la paleta de las prendas fotografiadas. Modo oscuro no es cosmético: la fotografía de producto/moda se percibe mejor sobre fondos oscuros neutros — se implementa desde el día uno, no como fase futura.

### 5.2 Tipografía

- **Familia:** sans-serif geométrica moderna (ej. Geist Sans / Inter) para UI; considerar una familia serif editorial opcional solo para titulares del Landing (`/`) si se busca un acento "editorial de moda" — **[Decisión de diseño abierta, a validar contigo]**.
- **Escala:** `text-xs` (12px, metadata/badges) → `text-sm` (14px, cuerpo secundario) → `text-base` (16px, cuerpo) → `text-xl/2xl` (títulos de sección) → `text-3xl/4xl` (hero, solo Landing).
- **Peso:** `font-medium`/`font-semibold` para jerarquía, evitar `font-bold` indiscriminado.

### 5.3 Espaciado y grid

- Escala de espaciado Tailwind por defecto (4px base).
- Grids de contenido: `max-w-7xl` en desktop, padding lateral `px-4` mobile / `px-8` desktop.
- Cards de prenda/outfit: `aspect-[3/4]` (proporción retrato, natural para fotografía de moda de cuerpo completo).

### 5.4 Componentes shadcn/ui a customizar primero

Priorizados por frecuencia de uso en los flujos de §3:

1. `Card` → base de `GarmentCard`, `OutfitCard`.
2. `Skeleton` → todos los estados de carga (crítico dado que hay 2 flujos síncronos con latencia perceptible y 1 asíncrono largo).
3. `Badge` → categoría, estética, score de confianza.
4. `Progress` → barra de progreso VTON (indeterminada durante processing).
5. `Dialog`/`Sheet` → confirmaciones, detalle rápido de prenda sin salir del grid.
6. `Tabs` → alternar "Mis prendas" / "Básicos StyleMe" dentro de `/wardrobe`.
7. `Toast` (sonner) → confirmaciones no bloqueantes ("Prenda guardada", "Job completado" cuando ocurre en background).

### 5.5 Iconografía (Lucide, según §6.1)

Mapeo semántico por categoría de prenda (`Shirt`, `Footprints` para calzado, etc.) y por estado (`Loader2` animado para processing, `CircleCheck` para completado, `TriangleAlert` para warning de blur/confianza baja).

---

## 6. Mapeo de Integraciones Frontend ↔ Backend

**Origen:** §11 íntegro. Tabla exhaustiva — ningún endpoint del documento base queda sin mapear.

| Endpoint | Método | Pantallas consumidoras | Hook (TanStack Query) | Zod schema | Estrategia de error/latencia |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/v1/garments/upload` | `POST` | `/onboarding` (paso 2), `/wardrobe/upload` | `useUploadGarment` (mutation) | `GarmentUploadResponseSchema` | Síncrono, timeout cliente 20s → `ApiError`; blur check previo en cliente reduce falsos envíos |
| `/api/v1/outfits/recommend` | `POST` | `/outfits` | `useRecommendOutfits` (query, key: filtros) | `OutfitRecommendationResponseSchema` | Síncrono, timeout 10s; estado vacío explícito si `outfits: []` |
| `/api/v1/vton/try-on` | `POST` | `/try-on` | `useCreateVtonJob` (mutation) | `VtonJobCreateResponseSchema` | Dispara Etapa 2 del flujo D; `estimated_time_seconds` alimenta el copy de progreso |
| `/api/v1/vton/status/{job_id}` | `GET` | `/try-on/jobs/[jobId]`, `/try-on/history` | `useVtonJobStatus` (query, `refetchInterval` dinámico) | `VtonJobStatusResponseSchema` | Polling con backoff (§3.4); `VTONJobTimeoutError` tras techo de tiempo, sin cancelar el job en backend |

**Gap identificado [requiere validación con equipo backend]:** el documento base no define un endpoint de **listado** de `Garments`/`Outfits`/historial de `VTONJob` por usuario (§11 solo cubre creación/consulta puntual). `/wardrobe`, `/outfits` (vista inicial sin filtros) y `/try-on/history` requieren un endpoint tipo `GET /api/v1/garments?user_id=`, `GET /api/v1/outfits?user_id=` y `GET /api/v1/vton/jobs?user_id=` respectivamente. Se documenta aquí como pendiente explícito — no se asume su forma para no violar la regla de "no inventar campos no listados" de `CLAUDE.md` §8.

**Ver `openspec/specs/08-api-contract-gaps.md`** para el contrato consolidado de estos gaps (más el de asociación de catálogo cápsula y sincronización de identidad Supabase↔`User`), con dueño, fase de corte por gap y proceso de cierre — esta nota se mantiene como referencia local, esa spec es la fuente única de verdad sobre su estado.

---

## 7. Estados de Error — Mapeo desde la Matriz de Riesgos (§8)

| Riesgo (§8) | Manifestación en backend | Tratamiento UX en frontend |
| :--- | :--- | :--- |
| Latencia VTON >15s | `status: processing` prolongado | Flujo D, Etapa 2: progreso por fases + salida no bloqueante (§3.4) |
| Fotos de baja calidad | Rechazo o baja confianza en `garments/upload` | Validación de blur **antes** del submit (Flujo B) + posibilidad de editar categoría/estética manualmente si el resultado es dudoso |
| Costo de inferencia GPU (caché de resultados) | Backend cachea outfit+foto repetidos | Frontend evita re-disparar `POST /vton/try-on` si ya existe resultado cacheado localmente (React Query cache) o conocido (`/try-on/history`) |
| Baja precisión en estéticas ambiguas | Respuesta Top-N con score en vez de valor único | Flujo B: mostrar Top-3 estéticas con barra de confianza, nunca una sola etiqueta absoluta |

---

## 8. Responsividad y Accesibilidad

- **Breakpoints:** mobile-first; `sm` (640px) tablet chico, `lg` (1024px) desktop. Bottom tab bar (mobile) vs top nav (`lg+`), ver §2.1.
- **Targets táctiles:** mínimo 44×44px en toda acción interactiva (selección de prendas en grids densos, chips de filtro).
- **Contraste:** paleta de §5.1 validada para WCAG AA en texto sobre fondo (`foreground`/`background` y `muted-foreground`/`muted`).
- **Alt text:** obligatorio y generado a partir de metadata real (`"{categoría}, estética {estética_dominante}"`), nunca `alt=""` en imágenes de producto — son el contenido central de la app.
- **Reduced motion:** todas las animaciones de progreso VTON y transiciones de card respetan `prefers-reduced-motion` (fallback a estados estáticos con el mismo texto informativo).
- **Foco de teclado:** flujos de upload y selección de outfit deben ser completables sin mouse (importante para `Dialog`/`Sheet` de shadcn, que ya maneja focus trap por defecto — no se debe romper esto al customizar).

---

## 9. Presupuesto de Performance

**[Decisión de diseño]**, no especificado en el documento base, necesario dado que la app es intensiva en imágenes:

- Imágenes servidas vía `next/image` con `sizes` correctos por breakpoint; formato `avif`/`webp` automático.
- `/wardrobe` y `/outfits` con scroll virtualizado o paginación si el armario supera ~50 items (evita jank en grids de imagen pesada).
- LCP objetivo < 2.5s en `/` y `/wardrobe` en conexión 4G simulada.
- Polling de VTON (`refetchInterval`) se pausa automáticamente si la pestaña pierde foco (`visibilitychange`) y se reanuda al volver, para no gastar batería/datos innecesariamente en mobile.

---

## 10. Trazabilidad: Fases del Proyecto → Entregables Frontend

**Origen:** §7.1.

| Fase (backend) | Entregable backend | Entregable frontend correspondiente |
| :--- | :--- | :--- |
| Fase 1 (Sem 1-4) | `POST /garments/analyze` | Flujo B completo (`/wardrobe/upload`, `GarmentCard`, validación de blur) puede desarrollarse contra un mock/MSW desde el día 1, sin esperar al backend real |
| Fase 2 (Sem 5-8) | `POST /outfits/recommend` | Flujo C (`/outfits`, `/outfits/[id]`) |
| Fase 3 (Sem 9-12) | `POST /vton/try-on`, polling | Flujo D completo, incluyendo estrategia de polling/timeout |
| Fase 4 (Sem 13-16) | — | Integración end-to-end real (reemplazo de mocks MSW por backend real), pulido de UI, Playwright E2E completo, auditoría de accesibilidad y performance |

Esto habilita desarrollo frontend **desacoplado** del avance real del backend: cada flujo (B, C, D) se construye y testea (Vitest/RTL/Playwright) contra mocks MSW que respetan los Zod schemas de `src/schemas/api/` desde la Fase 1, y se conectan al backend real conforme cada fase entrega su endpoint.

---

## 11. Próximos Pasos

Este documento es la base de la que se derivaron las specs técnicas en `/specs/`, siguiendo la Regla de Oro SDD de `CLAUDE.md`. Cobertura final — las 9 pantallas del inventario de §4 están cubiertas por 8 specs, sin huecos:

1. `specs/00-design-system.md` — tokens, componentes shadcn base, Tailwind config, contrato de accesibilidad por componente.
2. `specs/01-api-client-and-schemas.md` — cliente HTTP, jerarquía de errores, Zod schemas de §6 (incluye ejemplos JSON de referencia y mapeo de códigos HTTP).
3. `specs/02-wardrobe-flow.md` — Flujo A + B (`/onboarding`, `/wardrobe*`), con máquina de estados de `GarmentAnalysisResult`.
4. `specs/03-outfits-flow.md` — Flujo C (`/outfits*`), con accesibilidad de grid navegable por teclado.
5. `specs/04-vton-flow.md` — Flujo D (`/try-on*`), con la máquina de estados completa del flujo asíncrono.
6. `specs/05-app-shell-and-navigation.md` — layout raíz, navegación adaptativa (§2.1), error boundary global.
7. `specs/06-landing-and-auth-flow.md` — Landing (§4.1) y autenticación vía Supabase Auth, con el gap crítico de reconciliación `auth.users` ↔ `User`.
8. `specs/07-profile-flow.md` — perfil de usuario (§4.9), preferencia de estética por defecto, cierre de sesión.

Todas las specs comparten dos reglas: (a) ningún gap identificado en el mapeo de integraciones (§6) se resuelve inventando un contrato — se documenta explícitamente y se aísla detrás de una interfaz swappable; (b) cada spec cierra con un manifiesto de archivos exacto, trazable 1:1 a la implementación bajo TDD.
