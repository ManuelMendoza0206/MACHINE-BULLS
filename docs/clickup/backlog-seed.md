# Backlog Seed — Listo para Transcripción a ClickUp

Extracción mecánica (no reinterpretada) de Epics → Stories a partir de las specs en `openspec/specs/` y `docs/context/backend-plan.md`, organizada según la estructura de `clickup_estructura.md`. Cumple la Definition of Ready ya definida ahí: cada story cita su spec de origen, trae Criterio de Aceptación literal, Story Points estimados (a recalibrar en Planning) y Riesgo Asociado.

> **No incluye asignación de `Dueño`** — deliberado, según instrucción explícita de no tocar la designación de personas todavía. El campo `Rol/Categoría` reemplaza esa función para poder filtrar y planificar sin fijar quién ejecuta cada cosa.

> **Sincronizado con el tablero real de ClickUp (espacio MachineBulls) el 2026-08-26.** Calendario canónico: 9 sprints de 2 semanas exactas (Sprint 0 → Sprint 8), Sprint 0 arrancó el 12-ago-2026, cierre de las 18 semanas el 15-dic-2026 — ver tabla completa en `docs/clickup/clickup_estructura.md`. Las etiquetas "Sprint N" de cada epic de abajo son las mismas que ya tenían; lo que cambió son las fechas reales detrás de cada número, no la numeración. El Hardening (QA/CI-CD/MLOps, epics Q1-Q7 al final de este documento) **no está comprimido al cierre** — va integrado dentro de estos mismos 9 sprints, distribuido por dependencia real (fundacional temprano, cierre de gates cerca del final).

---

## Cómo leer este documento

- **Epic** = una capability/spec completa, o un epic transversal de proceso. 25 epics totales: 9 frontend especificadas en detalle + 5 backend a nivel de epic (pendientes de spec detallada) + 4 transversales de proceso (Discovery/Architecture/Risk/Deploy iniciales) + **7 de Hardening QA/CI-CD/MLOps (Q1-Q7)**, ver esa sección al final.
- **Story** = un criterio de aceptación de la spec, copiado literal (regla DoR §2). Frontend: 79 stories extraídas de las 8 specs de implementación + 5 stories de cierre de gap de `api-contract-gaps`.
- **Lista ClickUp:** `Build` (implementación) o `QA` (gates de cobertura/CI) según el tipo de criterio — la mayoría de specs terminan en 2 criterios de tipo QA (cobertura de tests, pipeline en verde).
- **SP:** Story Points (Fibonacci), estimación inicial heurística — se recalibra en Sprint Planning por el equipo real.
- **Riesgo:** heredado de la sección de gaps/riesgos de cada spec cuando aplica; `Bajo` por defecto.

---

## EPICS DE FRONTEND (specs completas — listas para Sprint 1 en adelante)

### Epic F1 — `frontend/design-system` (Sprint 1, `role:frontend`)

| Story (criterio literal) | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `tailwind.config.ts` deriva sus colores de `src/config/design-tokens.ts`, sin valores hex duplicados hardcodeados en el config. | Build | 2 | Bajo |
| Todos los pares texto/fondo de §2.1 pasan el test de contraste AA en ambos temas (claro y oscuro). | QA | 3 | Bajo |
| `cn()` implementado y cubierto por tests unitarios (mínimo 4 casos: merge simple, conflicto Tailwind, condicional falsy, array anidado). | Build | 2 | Bajo |
| Los 8 componentes de §2.4 existen en `src/components/ui/`, tipados sin `any`, con las variantes exactas especificadas. | Build | 5 | Bajo |
| Cambio de tema claro/oscuro no produce parpadeo visible (`suppressHydrationWarning` configurado, verificado manualmente en `npm run dev`). | Build | 3 | Bajo |
| `npm run typecheck && npm run lint && npm run test` pasan en verde para todo el contenido de esta spec. | QA | 2 | Bajo |
| Los 6 requisitos de accesibilidad de §2.5 están cubiertos por un test cada uno (no solo heredados implícitamente de Radix sin verificación propia). | QA | 3 | Bajo |

### Epic F2 — `frontend/api-client-and-schemas` (Sprint 1, `role:frontend`) — bloquea a todos los demás epics de frontend

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `apiRequest<T>` implementado en `src/lib/api/client.ts` cumpliendo los 7 puntos de comportamiento de §2.2. | Build | 5 | Bajo |
| Jerarquía de errores de §2.1 implementada exactamente como en `CLAUDE.md` §5 (mismas 5 clases, mismos nombres). | Build | 3 | Bajo |
| Los 4 schemas de §2.3 existen, tipados sin `any`, exportando su `z.infer` correspondiente. | Build | 3 | Bajo |
| `category` (Garment) y `aesthetic` (Outfit) permanecen como `z.string()` con el comentario de gap explícito — no se cierra el enum sin confirmación backend. | Build | 1 | Medio (depende de contrato backend) |
| `OutfitPositionSchema` y `VtonJobStatusSchema` son `z.enum` cerrados. | Build | 1 | Bajo |
| `VtonJobStatusResponseSchema` tiene un `.refine()` probado que exige `result_url` cuando `status === 'completed'`. | Build | 2 | Bajo |
| Las 4 funciones de dominio de §2.4 implementadas, sin lógica más allá de invocar `apiRequest`. | Build | 3 | Bajo |
| Cobertura de tests ≥ 90% para `src/lib/api/`, `src/lib/errors.ts` y `src/schemas/api/`. | QA | 3 | Bajo |
| Los fixtures JSON de §2.5 son la única fuente de datos de prueba reutilizada entre specs. | Build | 2 | Bajo |
| El mapeo de §2.6 está implementado como función pura testeable (`mapStatusToUserMessage`). | Build | 2 | Bajo |
| `npm run typecheck && npm run lint && npm run test` pasan en verde. | QA | 2 | Bajo |

### Epic F3 — `frontend/wardrobe-flow` (Sprints 1-2, `role:frontend`)

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `detectBlur` implementado y retorna resultado consistente para fixtures nítidos/borrosos, sin bloquear el hilo principal más de 300ms. | Build | 5 | Bajo |
| `useUploadGarment` expone los 4 estados (`idle\|analyzing\|success\|error`) y nunca deja al consumidor con un error no tipado. | Build | 3 | Bajo |
| `GarmentDropzone` soporta selección múltiple y drag&drop, con targets táctiles ≥44px. | Build | 3 | Bajo |
| Subida de N archivos procesa cada uno de forma independiente — un fallo no cancela ni bloquea a los demás. | Build | 3 | Bajo |
| Categoría y estética del resultado son editables inline antes de "confirmar". | Build | 2 | Bajo |
| `OnboardingWizard` permite completar el flujo usando SOLO subida propia, SOLO catálogo cápsula, o ambas combinadas. | Build | 5 | Bajo |
| Estado vacío de `/wardrobe` presenta el mismo doble CTA que el onboarding paso 2. | Build | 2 | Bajo |
| Subida por lote respeta el techo de concurrencia configurado; excedente en `queued`, FIFO, sin detenerse ante fallos. | Build | 5 | Medio (nuevo desde auditoría QA, sin implementación previa de referencia) |
| El catálogo cápsula cumple el checklist de curación (cobertura por posición, por estética, estándar visual). | Build/Data | 3 | Medio (depende de curaduría de contenido, no solo código) |
| `GarmentCard` expone `alt` no vacío derivado de categoría/estética real, verificado por test. | QA | 1 | Bajo |
| Estados de shimmer/skeleton respetan `prefers-reduced-motion`, verificado por test. | QA | 2 | Bajo |
| Cobertura de tests ≥ 80% en `src/features/garments/` y `src/features/onboarding/`. | QA | 3 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

### Epic F4 — `frontend/outfits-flow` (Sprints 3-4, `role:frontend`)

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `useRecommendOutfits` con `enabled: false` cuando `onlyAvailableGarments=true` y el armario no alcanza. | Build | 3 | Bajo |
| Filtros persisten en la URL (bookmarkeable/compartible), no en estado de componente ni Zustand. | Build | 2 | Bajo |
| Debounce de 300ms verificado en tests con fake timers. | Build | 2 | Bajo |
| Estado vacío distingue "sin resultados por filtro" de "falta una categoría en el armario". | Build | 3 | Bajo |
| `OutfitScoreBreakdown` implementa progressive disclosure (colapsado por defecto). | Build | 2 | Bajo |
| Navegación grid→detalle reutiliza cache de TanStack Query sin re-fetch. | Build | 2 | Bajo |
| CTA de detalle navega a `/try-on` pasando el `outfitId` correctamente. | Build | 1 | Bajo |
| `OutfitCard` y el detalle exponen `alt` no vacío derivado de estética/prendas reales. | QA | 1 | Bajo |
| Transiciones del grid respetan `prefers-reduced-motion`. | QA | 2 | Bajo |
| Cobertura de tests ≥ 80% en `src/features/outfits/`. | QA | 3 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

### Epic F5 — `frontend/vton-flow` (Sprints 5-6, `role:frontend`) — mayor riesgo de UX del producto

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `useVtonJobStatus` implementa exactamente el algoritmo de backoff/timeout, cubierto por tests con fake timers. | Build | 8 | Alto (núcleo async del producto) |
| `VtonJobTimeoutError` se lanza solo tras `timeoutMs` sin estado terminal, nunca cancela el job en backend. | Build | 3 | Medio |
| Polling se pausa/reanuda correctamente según `document.visibilityState`. | Build | 3 | Bajo |
| `checkCachedVtonResult` evita llamada duplicada para el mismo par (outfit, foto) en la sesión. | Build | 5 | Medio (costo de inferencia GPU real) |
| `VtonFailedView` maneja `error_message` presente y `null` sin texto roto. | Build | 2 | Bajo |
| `VtonTimeoutView` ofrece verificación manual sin reiniciar el loop automático. | Build | 3 | Bajo |
| `UserPhotoCapture` reutiliza `detectBlur` de wardrobe-flow (sin duplicar heurística). | Build | 2 | Bajo |
| Botón "seguir usando la app" navega sin interrumpir el polling en curso. | Build | 5 | Medio |
| CTA "Generar prueba virtual" se deshabilita durante `pending`, evitando doble-submit. | Build | 2 | Alto si se omite (dispara inferencia GPU duplicada — costo real) |
| `VtonResultView` expone `alt` no vacío y distinguible en ambas imágenes. | QA | 1 | Bajo |
| `VtonProgressView` respeta `prefers-reduced-motion`. | QA | 2 | Bajo |
| Cobertura de tests ≥ 85% en `src/features/vton/`. | QA | 5 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

### Epic F6 — `frontend/app-shell-and-navigation` (Sprint 1, `role:frontend`) — dependencia temprana de layout

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `AppProviders` instancia cada provider exactamente una vez por sesión. | Build | 2 | Bajo |
| `TopNav`/`BottomTabBar` alternan visibilidad solo por CSS — cero JS de detección de viewport. | Build | 3 | Bajo |
| Navegación activa usa `aria-current="page"` y señal visual no solo de color. | Build | 2 | Bajo |
| `GlobalError` cubre los 5 casos de la tabla de tipos de error, cada uno con copy distinto verificado. | Build | 3 | Bajo |
| `SkipToContentLink` funcional por teclado, primer elemento enfocable. | Build | 1 | Bajo |
| Cambiar de tema no produce parpadeo visible a nivel de layout completo. | QA | 2 | Bajo |
| Cobertura de tests ≥ 80% en `src/components/shell/` y `src/app/providers.tsx`. | QA | 3 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

### Epic F7 — `frontend/landing-and-auth-flow` (Sprint 1-2, `role:frontend`) — superficie de seguridad

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `useAuth()` implementado exactamente con el contrato, consumido sin cambios por app-shell y profile-flow. | Build | 5 | Medio |
| Middleware protege exactamente las 4 rutas del matcher — ninguna otra. | Build | 3 | Alto si falla (expone rutas privadas) |
| Mensajes de error de login nunca distinguen usuario inexistente de contraseña incorrecta. | Build | 2 | Medio (seguridad) |
| Formularios deshabilitan submit durante estado pendiente (previene doble submit). | Build | 2 | Bajo |
| `signUpWithEmail`/`signInWithEmail`/`signOut` nunca propagan error crudo de Supabase. | Build | 3 | Bajo |
| Landing no realiza llamada de red bloqueante; CTA se adapta post-hidratación. | Build | 2 | Bajo |
| Cobertura de tests ≥ 85% en `src/features/auth/`. | QA | 5 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

**Story adicional no derivada de checklist, pero exigida por el gap G5 (`api-contract-gaps`):** *"El flujo de signup no puede considerarse Done hasta que exista una fila real en `User` tras el registro — verificar contra el trigger de backend, no asumir."* — SP 3, Riesgo Alto, bloqueada hasta que `backend/domain-and-database` implemente el trigger de `docs/context/backend-plan.md` §7.

### Epic F8 — `frontend/profile-flow` (Sprint 3, `role:frontend`)

| Story | Lista | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| `/profile` no dispara llamada de red para mostrar name/email/createdAt — 100% de la sesión. | Build | 2 | Bajo |
| Preferencia de estética por defecto persiste en `localStorage`, aislada por `userId`. | Build | 3 | Bajo |
| Query params de `/outfits` tienen prioridad sobre la preferencia guardada. | Build | 2 | Bajo |
| `SignOutButton` exige confirmación explícita antes de cerrar sesión. | Build | 1 | Bajo |
| Cierre de sesión limpia también `onboardingStore` (evita fuga de estado entre usuarios). | Build | 2 | Medio (dispositivo compartido) |
| `ProfileHeader` no expone control de edición de name/email (sin endpoint real que lo persista). | Build | 1 | Bajo |
| Cobertura de tests ≥ 80% en `src/features/profile/`. | QA | 2 | Bajo |
| `npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde. | QA | 2 | Bajo |

### Epic F9 — `frontend/api-contract-gaps` (transversal, `role:pm-docs` + `role:backend`) — lista **Architecture/Risk**, no Build

No son historias de implementación frontend — son historias de **cierre de contrato**, dueñas naturales del backend una vez asignado:

| Story (gap) | Lista | SP | Riesgo | Bloquea |
| :--- | :--- | :--- | :--- | :--- |
| G1 — Backend publica `GET /api/v1/garments` (listado paginado) | Architecture | 5 | Alto | `/wardrobe` real (Epic F3) |
| G2 — Backend confirma si existirá `GET /api/v1/outfits/{id}` o el frontend re-deriva del último `recommend` | Architecture | 3 | Medio | `/outfits/[id]` en acceso directo (Epic F4) |
| G3 — Backend publica `GET /api/v1/vton/jobs` (historial) | Architecture | 3 | Medio | `/try-on/history` (Epic F5) |
| G4 — Backend implementa `POST /garments/capsule/{id}/adopt` (`docs/context/backend-plan.md` §6.2) | Architecture | 3 | Medio | Onboarding paso 2 rama B (Epic F3) |
| G5 — Backend implementa el trigger de sincronización `auth.users`↔`User` (`docs/context/backend-plan.md` §7) | Architecture | 5 | **Crítico** | Todo flujo de signup end-to-end (Epic F7) |

---

## EPICS DE BACKEND (specs completas — 5/5 escritas y validadas, `openspec validate --specs`: 14/14)

Origen: `openspec/specs/backend/*/spec.md`. Las 39 stories siguientes son extracción literal de los Criterios de Aceptación de cada spec — mismo estándar DoR que las de frontend.

### Epic B1 — `backend/domain-and-database` (Sprint 1-2, `role:backend`) — bloquea a B2-B5

| Story | Sprint | Riesgo |
| :--- | :--- | :--- |
| Los 6 modelos SQLAlchemy (User, Garment, GarmentOwnership, Outfit, OutfitGarment, VTONJob) existen con exactamente los campos definidos, sin columnas no autorizadas. | 1 | Bajo |
| Los schemas Pydantic coinciden campo a campo con los Zod de `api-client-and-schemas/spec.md`. | 1 | Alto (rompe el contrato con el frontend si diverge) |
| Migración Alembic upgrade/downgrade simétrica, verificada en CI. | 1 | Bajo |
| Índice HNSW creado y usado (no bypaseado) por la consulta k-NN de referencia, verificado con `EXPLAIN ANALYZE`. | 2 | Medio |
| Trigger `on_auth_user_created` implementado y verificado (éxito y fallo transaccional). | 1 | **Crítico** (cierra G5) |
| Script de seed del catálogo cápsula verifica cobertura mínima (posición + estética) y aborta si no la cumple. | 2 | Medio |
| `GarmentOwnership` soporta N usuarios por prenda cápsula sin duplicar `Garment`, verificado por test. | 2 | Bajo |
| Cobertura de tests ≥ 90% en `src/domain/`. | 2 | Bajo |

### Epic B2 — `backend/garment-analysis-service` (Sprint 2-3, `role:ml-pipeline`)

| Story | Sprint | Riesgo |
| :--- | :--- | :--- |
| `BackgroundRemover` implementado con `rembg`/U-2-Net, invocado antes de cualquier clasificación. | 2 | Bajo |
| `AestheticClassifier` (CLIP zero-shot) implementado con prompts estructurados por estética. | 2 | Bajo |
| Fallback a ResNet-50 fine-tuned disparado únicamente cuando la confianza CLIP cae bajo el umbral configurado. | 3 | Medio |
| Respuesta expone `top_aesthetics` como lista ordenada con ≥1 elemento, nunca una etiqueta única sin score. | 2 | Bajo |
| Normalización 224×224 RGB aplicada de forma idéntica a CLIP y al fallback. | 2 | Bajo |
| Timeout total del endpoint ≤ 20s verificado con test de presupuesto de tiempo. | 3 | Medio |
| Suite de evaluación de F1 real (no bloqueante de CI) documentada y ejecutable bajo demanda. | 3 | Medio |
| Cobertura de tests ≥ 90% en `src/services/garment_analysis/`. | 3 | Bajo |

### Epic B3 — `backend/recommender-engine` (Sprint 3-4, `role:ml-pipeline`)

| Story | Sprint | Riesgo |
| :--- | :--- | :--- |
| `ChromaticHarmonyScorer` implementado con reglas de análogos/complementarios/triadas. | 3 | Bajo |
| `CompatibilityEmbeddingModel.embed()` consume el modelo ya entrenado (D=128), sin entrenamiento en este servicio. | 3 | Bajo |
| Consulta de compatibilidad usa k-NN sobre el índice HNSW, no fuerza bruta. | 3 | Medio |
| `available_garment_ids` insuficiente devuelve outfits vacío con 200 OK, nunca un error. | 3 | Bajo |
| `target_aesthetic` prioriza sin excluir por completo otras estéticas cuando hay pocas combinaciones. | 4 | Bajo |
| Timeout total del endpoint ≤ 10s verificado con test de presupuesto de tiempo. | 4 | Medio |
| Suite de evaluación FITB (no bloqueante) documentada y ejecutable, reporta contra el umbral de 70%. | 4 | Medio |
| Cobertura de tests ≥ 90% en `src/services/recommender/`. | 4 | Bajo |

### Epic B4 — `backend/vton-pipeline` (Sprint 5-6, `role:ml-pipeline`+`role:backend`) — mayor riesgo del backend

| Story | Sprint | Riesgo |
| :--- | :--- | :--- |
| `PoseExtractor` (MediaPipe Pose) y parsing (SCHP) ejecutados antes de cualquier llamada al proveedor externo. | 5 | Medio |
| Foto sin pose detectable marca el job como `failed` sin invocar al proveedor externo. | 5 | Medio (ahorro de costo GPU) |
| Backoff exponencial con máximo 3 reintentos implementado y testeado con fake timers. | 5 | Bajo |
| Circuit breaker implementado: abre tras N fallos consecutivos, resetea con un éxito. | 5 | Alto |
| `VTONJob` se persiste en `pending` inmediatamente al recibir la solicitud. | 5 | Bajo |
| `VtonInferenceProvider` es una interfaz swappable — ningún router importa directamente el SDK de Replicate. | 6 | Medio (D2 podría reabrirse) |
| `POST /vton/try-on` responde en <10s (solo creación del job). | 6 | Bajo |
| Cobertura de tests ≥ 90% en `src/services/vton/`. | 6 | Bajo |

### Epic B5 — `backend/api-gateway` (Sprint 2→6, `role:backend`) — cierra G1-G4

| Story | Sprint | Riesgo |
| :--- | :--- | :--- |
| Los 8 endpoints del gateway implementados, incluyendo los 4 que cierran G1-G4, con la forma exacta ya contratada. | 2 | Alto |
| Exception Handler global cubre las 4 subclases de `StyleMeException` con el mapeo de status correcto. | 2 | Bajo |
| `GET /garments` y `GET /vton/jobs` paginan por cursor, sin degradación ni duplicados/omisiones entre páginas. | 3 | Medio |
| `POST /garments/capsule/{id}/adopt` es idempotente en efecto (409 en la segunda invocación, sin fila duplicada). | 3 | Medio |
| CORS restringido a orígenes conocidos, rate limiting aplicado solo a `/garments/upload` y `/vton/try-on`. | 6 | Alto |
| Los fixtures de test del gateway son los mismos JSON de `api-client-and-schemas/spec.md` — cero fixtures divergentes. | 6 | Bajo |
| Cobertura de tests ≥ 90% en `src/api/`. | 6 | Bajo |

---

## EPICS TRANSVERSALES (no ligadas a una sola spec)

### Epic X1 — Discovery (Sprint 0, ya completado — histórico)
Evidencia ya existente: `team_charter.md`, `priorizacion_casos.md`. Sin stories nuevas — se registra en ClickUp como `Done` con enlace a estos archivos, para no dejar la lista Discovery vacía en el tablero inicial.

### Epic X2 — Architecture / ADRs retroactivos (Sprint 0, `role:pm-docs`)
5 stories, 1 SP cada una (transcripción, no decisión nueva):
- ADR-0001: Pivote de plataforma a Next.js web (`constitution.md` §8)
- ADR-0002: Supabase Auth como proveedor de identidad
- ADR-0003: `GarmentOwnership` para catálogo cápsula compartido
- ADR-0004: Cloudinary como almacenamiento de objetos
- ADR-0005: Alcance académico/no comercial + SCHP para human parsing

### Epic X3 — Risk (continuo, `role:pm-docs`, revisado cada Sprint Review)
Fuente: `constitution.md` §7. Stories de **seguimiento**, no de cierre único:
- Monitoreo de costo/latencia de inferencia GPU — revisar cada sprint desde B4.
- Mecanismo de consentimiento/retención de fotos de usuario — **aún sin diseño concreto**, SP 5, Riesgo Alto, debe resolverse antes de Sprint 5 (integración VTON real).
- Calidad realista del try-on (SSIM/LPIPS) — story de monitoreo continuo desde B4, no validación única.

### Epic X4 — Deploy / CI-CD (Sprint 0-1, `role:devops-infra`)
- Pipeline GitHub Actions (lint→typecheck→test→build en PR; +e2e+deploy en merge a `main`) — SP 5.
- Logging estructurado + tracking de errores (Sentry tier gratuito) — SP 3.
- `npm audit`/`pip-audit` integrado al pipeline — SP 2.

---

## EPICS DE HARDENING — QA / CI-CD / MLOps (Q1-Q7)

**Origen:** rol de experto QA/CI-CD/Deploy solicitado explícitamente para enriquecer el tramo final del proyecto con estándares de industria — no comprimido al cierre, distribuido dentro de los 9 sprints por dependencia real (fundacional temprano — entornos, secrets, registro de modelos —, cierre de gates cerca del final — contract tests, load testing, release management).

### Epic Q1 — Test Automation & Coverage (lista QA, `role:qa`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Completar la suite E2E cubriendo los 4 flujos críticos (upload→outfit→VTON, auth, onboarding, historial) corriendo en CI, no solo local. | 2 | 5 | Bajo |
| Contract tests entre frontend y backend basados en los schemas Zod, ejecutados contra el OpenAPI real del backend — fallan si el contrato diverge. | 6 | 5 | Alto (diverge sin detectarse = rompe producción silenciosamente) |
| Visual regression testing sobre los 8 componentes base del design-system. | 1 | 3 | Bajo |
| Gate de cobertura mínima por spec (80-90%) enforced en CI, bloqueando merge si cae por debajo. | 1 | 3 | Medio |

### Epic Q2 — CI/CD Productivización (lista Deploy, `role:devops-infra`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Entornos separados dev/staging/prod, cada uno con sus propias credenciales (Cloudinary, Supabase, Replicate). | 0 | 5 | Alto (mezclar entornos = incidente de datos real) |
| Pipeline de deploy con rollback automático ante fallo de health-check post-deploy. | 8 | 5 | Alto |
| Gestión de secretos vía GitHub Actions secrets, con verificación automática en CI de que ninguno quede hardcodeado. | 0 | 3 | Alto |
| Smoke tests automáticos en staging antes de habilitar la promoción a producción. | 8 | 3 | Medio |

### Epic Q3 — MLOps (lista Build, `role:ml-pipeline`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Registro y versionado de modelos (CLIP fine-tuned, embedding D=128, checkpoint VTON) con metadata de métricas. | 2 | 5 | Alto |
| Gate de promoción de modelo: bloquear despliegue si F1 < 0.82/0.75 o FITB < 70% (`plan-base.md` §9). | 4 | 5 | Alto |
| Monitoreo de drift de calidad VTON (SSIM/LPIPS) en producción. | 6 | 5 | Medio |

### Epic Q4 — Observabilidad & SRE (lista Deploy, `role:devops-infra`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Dashboards de latencia/error rate por endpoint, foco en `/vton/try-on`. | 1 | 3 | Bajo |
| Definir y documentar SLOs formales (p95 VTON, uptime API). | 1 | 2 | Medio |
| Alerting configurado (Sentry + umbral de latencia) con canal de notificación al equipo. | 5 | 3 | Bajo |

### Epic Q5 — Seguridad & Compliance (lista Risk, `role:backend`/`qa`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Diseñar e implementar consentimiento explícito + retención de fotos de usuario — cierra el riesgo Alto de `constitution.md` §6. | 3 | 8 | **Crítico** |
| Secrets scanning automático en cada PR (gitleaks o equivalente). | 0 | 2 | Alto |
| Checklist OWASP Top 10 en endpoints de auth y upload, con hallazgos/mitigaciones documentados. | 7 | 5 | Alto |

### Epic Q6 — Release Management (lista Reportes, `role:pm-docs`/`devops-infra`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Runbook de incidentes (VTON/Replicate caído, Supabase caído, costo GPU disparado). | 7 | 3 | Medio |
| Playbook de rollback manual, respaldo del rollback automático de Q2. | 8 | 2 | Medio |
| Documentación de handoff/demo final (README ejecutivo + guion de demo). | 8 | 3 | Bajo |
| Changelog versionado (Keep a Changelog) desde el primer release. | 1 | 1 | Bajo |

### Epic Q7 — Performance & Load Testing (lista QA, `role:qa`)

| Story | Sprint | SP | Riesgo |
| :--- | :--- | :--- | :--- |
| Prueba de carga del endpoint VTON simulando usuarios concurrentes, midiendo degradación de latencia/costo GPU. | 6 | 5 | Alto |
| Verificación automatizada de presupuestos de performance (LCP<2.5s, etc.) vía Lighthouse CI. | 4 | 3 | Medio |

---

## Resumen cuantitativo

| Categoría | Epics | Stories derivadas | SP total estimado |
| :--- | :--- | :--- | :--- |
| Frontend (implementación) | 8 | 79 | ~215 |
| Frontend (gaps, gobierno) | 1 | 5 | 19 |
| **Backend (implementación, specs completas)** | **5** | **39** | **~95** |
| Transversal inicial (Discovery/Architecture/Risk/Deploy) | 4 | 12 | ~30 |
| Hardening QA/CI-CD/MLOps (Q1-Q7) | 7 | 23 | ~76 |
| **Total** | **25** | **158** | **~435** |

**Las 14 specs (9 frontend + 5 backend) están completas y validadas** (`openspec validate --specs`: 14/14 pass) — el backlog ya no tiene ningún epic a nivel placeholder. Con velocity desconocida (equipo nuevo en este proceso), Sprint 0-1 debe tratarse como calibración — no fijar compromisos de alcance sobre el total de ~435 SP en 9 sprints (18 semanas, ~24 SP/semana) hasta cerrar los primeros sprints reales y medir velocity observada.
