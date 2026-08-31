# Estructura y Operativa del Tablero ClickUp

> ⚠️ **Snapshot del 2026-08-26.** El Sprint 1 se reconcilió con la documentación el 31 ago
> (scaffold entregado, 5 componentes no 8, sin Storybook, etc.) — ver `docs/sprint-plans/sprint-1-manifest.md`
> §7 para el checklist de re-sincronización del tablero (dueño: Manuel / Asiento D). Este doc
> vuelve a ser fiel al tablero cuando ese checklist esté aplicado y `SPRINT-1-MASTER.csv` exportado.

## Estado del Tablero (snapshot 2026-08-26)

El espacio **MachineBulls⚙️🐂** (Workspace "Leonardo Ibarra López") ya existe y está poblado — esto no es un plan a futuro, es el estado real verificado con paginación completa:

| Métrica | Valor |
| :--- | :--- |
| Listas activas | 8/8 (todas en uso; `Data` es la única aún vacía — sin tareas de curación de dataset todavía) |
| Epics totales | 25 (0 a nivel placeholder — las 14 specs, 9 frontend + 5 backend, están completas) |
| Historias totales | 158 |
| Tareas totales (epics + historias) | 185 |
| Story Points estimados (total) | ~435 |
| Ventana del proyecto | 9 sprints de 2 semanas — 2026-08-12 → 2026-12-15 (18 semanas exactas) |
| Tareas sin fecha asignada | 0 |
| Specs OpenSpec válidas | 14/14 (`openspec validate --specs`) |

Fuente detallada de historias por epic: `docs/clickup/backlog-seed.md`. Este documento (`clickup_estructura.md`) es la referencia de *estructura y proceso*; `backlog-seed.md` es la referencia de *contenido*.

---

## Listas del Espacio de Trabajo (Space)

El proyecto se organizará en ocho listas estándar para garantizar el flujo y la trazabilidad del trabajo según el ciclo de vida de desarrollo de IA:

| Lista | Uso típico / Propósito | Entregables y Evidencia asociada |
|---|---|---|
| **Discovery** | Definición de problema, usuarios, Product Goal, priorización | `team_charter.md`, `priorizacion_casos.md` |
| **Data** | Fuentes, permisos, limpieza, contratos, versionado | Datasets, scripts de ETL, data datasheets |
| **Architecture** | Diagramas, ADR, decisiones técnicas, riesgos | Diagramas de arquitectura, documentos ADR |
| **Build** | Desarrollo de modelos, backend, frontend e integración | Código fuente, endpoints API, modelos |
| **QA** | Pruebas unitarias, métricas de IA, integración y seguridad | Matriz de pruebas, reportes de evaluación |
| **Deploy** | Contenedorización, CI/CD, infraestructura cloud | Dockerfiles, scripts de despliegue |
| **Risk** | Bloqueos, amenazas, mitigaciones y seguimiento | Registro de bloqueos, matriz de mitigación |
| **Reportes / Evidencia** | Archivo Markdown versionado | Enlace a la evidencia en GitHub |

---

## Campos Personalizados Obligatorios (Custom Fields)

Cada tarea creada en ClickUp debe completar de forma obligatoria los siguientes campos antes de pasar al estado *In Progress*:

1. **Sprint (Dropdown / Tag):** Identifica el Sprint actual de ejecución (ej. `Sprint 0`, `Sprint 1`).
2. **Dueño (Assignee):** Integrante directamente responsable de la ejecución y entrega de la tarea.
3. **Criterio de Aceptación (Text Area / Checklist):** Condición técnica y funcional clara que determina cuándo la tarea cumple lo esperado.
4. **Enlace a Evidencia (URL):** Link obligatorio a GitHub (commit, PR o archivo Markdown) que demuestra el trabajo realizado.
5. **Riesgo Asociado (Dropdown):** Nivel de riesgo implícito (`Bajo`, `Medio`, `Alto`, `Crítico`).
6. **Estado de Bloqueo (Dropdown / Label):** Indica si la tarea está expedita (`Sin Bloqueo`) o detenida (`Bloqueado`).

---

## Estados del Flujo de Trabajo

**Corrección (2026-08-26):** los 5 estados originalmente documentados aquí (To Do/In Progress/In Review-PR/Done/Blocked) **no son los que existen realmente** en el espacio ClickUp "MachineBulls⚙️🐂" — eran un diseño conceptual previo a crear el espacio real. Los estados nativos del espacio son estos 8, y este documento se corrige para usarlos como fuente de verdad:

| Estado real (ClickUp) | Equivalente conceptual | Uso |
| :--- | :--- | :--- |
| `to do` | To Do | Tarea definida con criterio de aceptación, lista para iniciar. |
| `planning` | *(nuevo, sin equivalente previo)* | Tarea en refinamiento/estimación (Story Points, Riesgo) antes de tomarse — cumple el DoR de `clickup_estructura.md` §Enriquecimiento antes de pasar a `to do`. |
| `in progress` | In Progress | Desarrollo activo. |
| `update required` | **≈ In Review / PR** (más preciso) | Código/documento enviado, pendiente de ajuste tras revisión — más específico que "en revisión" porque implica acción pendiente del autor, no solo espera. |
| `at risk` | *(nuevo)* | Tarea en riesgo real de no cumplir su fecha de sprint — dispara la regla de bloqueo de `team_charter.md` si supera 12h sin resolución. |
| `on hold` | **≈ Blocked** | Pausada por un impedimento reportado en la lista *Risk*. |
| `complete` | Done | Verificada, cumple el DoD (`.speckit/constitution.md` §4), con evidencia enlazada. |
| `cancelled` | *(nuevo)* | Descartada — el trabajo ya no aplica (alcance cambiado, gap cerrado de otra forma, etc.). Se documenta el motivo en un comentario antes de cancelar, nunca se borra la tarea. |

**Nota de proceso:** no existe un estado nativo literal "in review" — se usa `update required` como el más cercano semánticamente (implica "aún requiere trabajo del autor antes de aprobar", que es justamente el estado de un PR con comentarios de revisión pendientes). Si el equipo prefiere un estado dedicado, requiere reconfigurar el espacio (`PUT /space/{id}` con un array de statuses nuevo) — no se hizo unilateralmente porque afecta a las 8 listas a la vez.

---

## Enriquecimiento del Proceso (2026-08-26)

Lo siguiente se añade sobre la estructura ya acordada (8 listas, 6 campos, 5 estados) — no la reemplaza. Objetivo: que el proceso sea indistinguible del de un equipo de producto senior en una empresa de software competente, dentro de las limitaciones reales de un equipo de 4 personas y 18 semanas.

### Metodología: Scrum, 9 sprints de 2 semanas exactas (18 semanas totales)

**Calendario canónico (2026-08-26, actualizado):** Fase 0 arrancó el **2026-08-12**. 9 sprints de 2 semanas cada uno (0 a 8), sin sprint de buffer separado — el hardening va integrado dentro de estos 9, distribuido por sprint según dependencia real, no concentrado al final:

| Sprint | Fechas | Fase (`plan-base.md` §7.1) | Foco (features + hardening integrado) |
| :--- | :--- | :--- | :--- |
| Sprint 0 | 12-ago → 25-ago | Setup | SDD, specs, backlog, entornos dev/staging/prod, secrets scanning |
| Sprint 1 | 26-ago → 8-sep | Fase 1 | `design-system`, `app-shell`, `auth`, dashboards base, SLOs, coverage gate |
| Sprint 2 | 9-sep → 22-sep | Fase 1 | `api-client-and-schemas`, `domain-and-database`, E2E suite, registro de modelos |
| Sprint 3 | 23-sep → 6-oct | Fase 1-2 | `wardrobe-flow`, diseño de consentimiento/retención de fotos |
| Sprint 4 | 7-oct → 20-oct | Fase 2 | `outfits-flow`, `recommender-engine`, gate de promoción de modelo, Lighthouse CI |
| Sprint 5 | 21-oct → 3-nov | Fase 2-3 | Alerting SRE |
| Sprint 6 | 4-nov → 17-nov | Fase 3 | `vton-flow`, `vton-pipeline`, contract tests, monitoreo de drift, load testing |
| Sprint 7 | 18-nov → 1-dic | Fase 3-4 | `landing-and-auth-flow`, `profile-flow`, checklist OWASP, runbook de incidentes |
| Sprint 8 | 2-dic → 15-dic | Fase 4 | `api-gateway`, rollback automático, smoke tests, release management, entrega final |

Ver `docs/clickup/backlog-seed.md` y el tablero real en ClickUp (espacio MachineBulls) para el desglose completo de historias por sprint — este documento fija el marco temporal, no repite el detalle de cada tarea.

**Ceremonias** (ajustadas a disponibilidad real del equipo, Lun-Dom 19:00-23:00 — `team_charter.md`):
- **Sprint Planning:** inicio de cada sprint, 45-60min, sincrónica.
- **Daily Standup:** asíncrono por escrito en el canal de WhatsApp/ClickUp (formato: qué hice / qué haré / bloqueos) — sincrónico solo si hay bloqueo crítico (`team_charter.md` regla de bloqueo).
- **Backlog Refinement:** a mitad de sprint, 30min — re-estimar y detallar las próximas 1-2 semanas de trabajo, nunca todo el backlog de una vez.
- **Sprint Review/Demo:** cierre de sprint, demo funcional del incremento (no solo código — un DoD sin demo no cuenta como completo para efectos de este ritual).
- **Retrospectiva:** cierre de sprint, formato Start/Stop/Continue, con acción concreta registrada en ClickUp para el siguiente sprint.

### Definition of Ready (DoR) — complementa el DoD ya existente

Una tarea puede entrar a "To Do" / ser tomada en un sprint solo si:
1. Referencia una spec existente en `openspec/specs/` (o su gap correspondiente en `frontend/api-contract-gaps`) — nunca una tarea sin spec de origen.
2. Su Criterio de Aceptación es texto copiado literal de la spec (checkbox de §5/Requirements), no reinterpretado.
3. Tiene estimación en Story Points (ver escala abajo).
4. Tiene Riesgo Asociado evaluado (aunque sea `Bajo`).
5. Si depende de un gap abierto (`frontend/api-contract-gaps`), la tarea explicita que se desarrolla contra mocks — nunca se asume el contrato real sin marcarlo.

### Story Points — escala Fibonacci

`1, 2, 3, 5, 8, 13` — 13 es señal de que la historia debe partirse antes de tomarse (regla dura, no sugerencia). Estimación en Planning por consenso rápido (Planning Poker asíncrono: cada quien propone en el hilo, se discute solo si hay >1 punto de diferencia).

### Categorías/Roles (Custom Field multi-select, nuevo — sin asignar personas todavía)

Etiqueta de **tipo de trabajo**, independiente del campo `Dueño` (que sigue siendo una persona). Permite filtrar el board por disciplina sin fijar quién lo hace:

`role:frontend` · `role:backend` · `role:ml-pipeline` · `role:devops-infra` · `role:qa` · `role:pm-docs`

### Priorización — WSJF ligero (nuevo Custom Field: Priority Score)

Mismo estilo de escala 1-5 ya usado en `priorizacion_casos.md`, aplicado ahora a nivel de historia:

```
Priority Score = (Valor de Negocio [1-5] + Reducción de Riesgo [1-5]) / Esfuerzo [Story Points, normalizado 1-5]
```

Se recalcula en cada Backlog Refinement, no una sola vez — el valor/riesgo de una historia cambia según lo que ya se completó.

### Architecture Decision Records (ADR) — formaliza lo que ya se hacía ad-hoc

`constitution.md` §8 ya registra decisiones de arquitectura en prosa. Se formaliza como ADR versionado en `docs/adr/NNNN-titulo-kebab-case.md`, plantilla mínima:

```
# ADR-NNNN: <título>
Estado: Propuesta | Aceptada | Superseded por ADR-XXXX
Contexto: <por qué se necesita decidir>
Decisión: <qué se decidió>
Consecuencias: <qué se gana, qué se sacrifica>
```

Cada ADR se enlaza desde una tarea de la lista **Architecture** en ClickUp. Las decisiones ya tomadas (pivote de plataforma, Supabase Auth, Cloudinary, alcance académico D2, SCHP) se retro-documentan como ADR-0001 a ADR-0005 antes de cerrar Sprint 0.

### Pipeline CI/CD (nuevo — la lista *Deploy* pasa de "mencionar Dockerfiles" a un pipeline concreto)

GitHub Actions, dos triggers:
- **En cada PR:** `lint` → `typecheck` → `test` (unit+integración) → `build`. Cualquier fallo bloquea el merge (ya exigido por `constitution.md` §3, esto solo lo automatiza).
- **En merge a `main`:** los mismos pasos + `test:e2e` contra un entorno de preview + despliegue.

Sin este pipeline, el DoD punto 4 ("las pruebas pasan exitosamente") depende de que un humano recuerde correrlas — no es el estándar de una empresa competente.

### Observabilidad y seguridad (nuevo — ítems que un board de nivel producción real no omite)

- **Logging estructurado + tracking de errores** (ej. Sentry en tier gratuito) desde el primer despliegue — aunque sea un proyecto académico, "producción simulada" implica poder ver por qué algo falló sin depender de reproducir el bug localmente.
- **Auditoría de dependencias** (`npm audit` / `pip-audit`) como parte del pipeline CI, no manual.
- Ambos se agregan como tareas de Sprint 0/1 en la lista **Deploy**, categoría `role:devops-infra`.