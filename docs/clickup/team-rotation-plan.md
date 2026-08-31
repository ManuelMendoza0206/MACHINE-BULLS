# Plan de Rotación de Equipo — 9 Sprints

> **Confirmado el 2026-08-26:** Persona 1 = **Leonardo Ibarra López**, Persona 2 = **Jaicel Velasco**, Persona 3 = **Huascar Camilo Durán Avendaño**, Persona 4 = **Manuel Jiménez Mendoza**. Este orden ya está aplicado en ClickUp (campo `Assignee` nativo) para las 185 tareas — ver §6 para la metodología exacta de automatización y §7 para la tabla final Sprint→Persona por asiento.

Marco de rotación para que los 4 integrantes (Manuel Jiménez Mendoza, Leonardo Ibarra López, Huascar Camilo Durán Avendaño, Jaicel Velasco) recorran el backlog completo de forma continua, cambiando de rol cada sprint. **Este documento define la estructura de rotación (los "asientos") y qué trabajo cae en cada uno por sprint — la asignación de qué persona ocupa qué asiento cada sprint la decide el Product Owner según habilidades**, según lo acordado.

---

## 1. Los 4 Asientos (roles que rotan)

Cada asiento es una función estable a través de los 9 sprints — lo que cambia sprint a sprint es **quién** lo ocupa, no lo que el asiento hace:

| Asiento | Función | Epics/listas típicas |
| :--- | :--- | :--- |
| **A — Feature Lead** | Dueño del workstream principal del sprint (la feature de mayor prioridad, `role:frontend` o `role:backend`/`role:ml-pipeline` según el sprint). Toma las historias de mayor SP/riesgo del epic principal. | `Build` |
| **B — Feature Support** | Pareja de A en el mismo epic (pair programming en las historias más riesgosas), o dueño del segundo epic del sprint si hay dos workstreams paralelos. | `Build` |
| **C — QA & Validación** | Valida lo que A/B construyeron en el **sprint anterior** (no el actual — validación con un sprint de rezago, shift-right deliberado) + las historias de Hardening (`Q1`, `Q7`) que caen ese sprint. | `QA`, historias de testing dentro de `Build` |
| **D — Infra/MLOps/Release** | CI/CD, observabilidad, seguridad, gestión de release y documentación de ese sprint (`Q2`, `Q3`, `Q4`, `Q5`, `Q6`, ADRs, runbooks) + coordinación de Scrum (ceremonias, ClickUp al día). | `Deploy`, `Risk`, `Architecture`, `Reportes` |

**Por qué validación con rezago de un sprint (Asiento C):** valida trabajo ya *terminado y estable*, no trabajo a medio hacer del mismo sprint — evita el antipatrón de "probar mientras se construye" que produce tests que persiguen una implementación que todavía cambia. Cuesta que el Sprint 0 y el Sprint 8 no tengan "sprint anterior"/"sprint siguiente" simétrico — ver notas por sprint abajo.

## 2. Ciclo de rotación (round-robin, período 4)

Los 4 integrantes rotan de asiento cada sprint, en ciclo fijo — cada persona pasa por los 4 asientos exactamente 2 veces a lo largo de los Sprints 1-8:

| Sprint | Persona 1 | Persona 2 | Persona 3 | Persona 4 |
| :--- | :--- | :--- | :--- | :--- |
| Sprint 1 | A | B | C | D |
| Sprint 2 | D | A | B | C |
| Sprint 3 | C | D | A | B |
| Sprint 4 | B | C | D | A |
| Sprint 5 | A | B | C | D |
| Sprint 6 | D | A | B | C |
| Sprint 7 | C | D | A | B |
| Sprint 8 | B | C | D | A |

Sustituye "Persona 1-4" por Manuel/Leonardo/Huascar/Jaicel según habilidades — la tabla ya garantiza que cada quien pasa por los 4 asientos exactamente 2 veces. **Sprint 0 queda fuera de la rotación** (ver §4 — es trabajo conjunto de setup, no tiene sentido dividir en asientos todavía).

## 3. Contenido real por sprint (qué hace cada asiento, derivado de `backlog-seed.md`)

| Sprint | Asiento A (Feature Lead) | Asiento B (Support) | Asiento C (QA, valida sprint anterior) | Asiento D (Infra/Release) |
| :--- | :--- | :--- | :--- | :--- |
| **0** (12-25 ago) | — trabajo conjunto: specs, entornos dev/staging/prod (Q2), secrets scanning (Q5) — | | | |
| **1** (26 ago-8 sep) | `frontend/design-system`, `frontend/app-shell-and-navigation` | `frontend/landing-and-auth-flow`, `backend/domain-and-database` (parte 1) | *(sin sprint previo aún — apoya a B en auth, la superficie de mayor riesgo)* | Dashboards/SLOs (Q4), coverage gate (Q1), changelog (Q6) |
| **2** (9-22 sep) | `frontend/api-client-and-schemas` | `backend/domain-and-database` (cierre), `backend/api-gateway` (base) | Valida Sprint 1: design-system, app-shell, auth | Registro de modelos (Q3), E2E suite (Q1) |
| **3** (23 sep-6 oct) | `frontend/wardrobe-flow` | `backend/garment-analysis-service` | Valida Sprint 2: api-client-and-schemas, domain-and-database | Diseño de consentimiento/retención de fotos (Q5 — **crítico**), pagination del gateway |
| **4** (7-20 oct) | `frontend/outfits-flow` | `backend/recommender-engine` | Valida Sprint 3: wardrobe-flow, garment-analysis-service | Gate de promoción de modelo (Q3), Lighthouse CI (Q7) |
| **5** (21 oct-3 nov) | `backend/vton-pipeline` (pose, circuit breaker) | Continúa vton-pipeline (pair — es el de mayor riesgo del backend) | Valida Sprint 4: outfits-flow, recommender-engine | Alerting SRE (Q4) |
| **6** (4-17 nov) | `frontend/vton-flow` | `backend/vton-pipeline` (cierre) | Valida Sprint 5: vton-pipeline parcial + contract tests (Q1), load testing (Q7) | Monitoreo de drift (Q3), CORS/fixtures del gateway |
| **7** (18 nov-1 dic) | `frontend/landing-and-auth-flow` (si quedó pendiente) / `frontend/profile-flow` | `backend/api-gateway` (cierre G1-G4) | Valida Sprint 6: vton-flow + vton-pipeline completo — **la validación de mayor riesgo del proyecto** | Checklist OWASP (Q5), runbook de incidentes (Q6) |
| **8** (2-15 dic) | Cierre de pendientes técnicos, buffer | Cierre de pendientes técnicos, buffer | Valida Sprint 7 + regresión final end-to-end | Rollback automático + smoke tests (Q2), release management (Q6), demo final |

## 4. Reglas de continuidad (para que el rezago de Asiento C no genere huecos)

1. **Handoff obligatorio de fin de sprint:** quien ocupó A/B debe dejar, antes del Sprint Review, un comentario en cada Epic de ClickUp con: qué quedó completo, qué quedó en `update required`, y cualquier decisión técnica no documentada — la persona que entra a Asiento C el sprint siguiente valida *contra eso*, no reconstruyendo contexto de cero.
2. **Sprint 0 sin Asiento C:** nadie valida retroactivamente el setup — Sprint 0 se cierra con Definition of Done normal (`constitution.md` §4), sin rezago.
3. **Sprint 1, Asiento C sin sprint previo que validar:** se reasigna a reforzar el epic de mayor riesgo de seguridad del sprint (`landing-and-auth-flow`) como tercer par, no queda ocioso.
4. **La rotación no aplica a G5 (trigger de identidad) ni a Q5 (consentimiento de fotos):** son de importancia crítica y conviene que la misma persona los lleve de punta a punta dentro de su sprint asignado, sin relevo a mitad de tarea — evita reintroducir el tipo de gap que ya encontramos con el design-system duplicado por falta de continuidad de contexto.
5. **Retrospectiva incluye una pregunta fija:** "¿algo se perdió en el handoff de este ciclo de rotación?" — si la respuesta es sí dos sprints seguidos, se ajusta el ciclo (ej. rotación cada 2 sprints en vez de cada 1) antes de seguir forzando el patrón.

## 6. Metodología de automatización (por qué es robusta y no se rompe con etiquetas ambiguas)

**Hallazgo (2026-08-26):** algunas historias de gaps (G1-G5) y de Risk tienen etiquetas de sprint no numéricas (`sprint:antes de sprint 5`, `sprint:5+`) — texto legible para humanos, pero frágil para una fórmula automática que espera un entero limpio. La corrección: **la automatización nunca lee el texto de la etiqueta**. Usa la fecha real (`due_date`) que cada tarea ya tiene asignada (100% de cobertura, verificado), la ubica dentro de la ventana de uno de los 9 sprints (`Sprint N: [start, end]`, ya definida en `clickup_estructura.md`), y de ahí deriva el sprint numérico de forma determinista — sin ambigüedad, sin depender de cómo se redactó la etiqueta.

**Regla de asignación (2 casos, según el tipo de epic):**

1. **Epics de feature (F1-F9 frontend, B1-B5 backend)** — trabajo contiguo y coherente, se asignan **completos a una sola persona/pareja**, determinada por quién ocupa el Asiento correspondiente (A o B) en el **sprint donde el epic arranca** (tabla de §3). Un epic no cambia de dueño a mitad de camino solo porque la rotación avanzó de sprint — evita fragmentar la propiedad de un trabajo coherente (mismo principio que ya protegía a G5 y Q5 en §4.4).
2. **Epics transversales y de Hardening** (`Q1-Q7`, `X1-X4`, y `Q3-MLOps` aunque viva en la lista Build) — sus historias están dispersas en sprints no contiguos por diseño (ej. Q1 tiene historias en sprints 1, 2, 3, 4 y 6). Aquí la asignación es **por historia individual**, no por epic completo: se deriva el sprint real de la historia (vía fecha, no etiqueta) y se asigna según el tipo de lista:
   - Lista **QA** → Asiento C (Validación) de ese sprint.
   - Listas **Deploy, Risk, Architecture, Reportes, Data** → Asiento D (Infra/Release) de ese sprint.

## 7. Tabla final Sprint → Persona por Asiento (aplicada en ClickUp)

| Sprint | Asiento A | Asiento B | Asiento C | Asiento D |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Leonardo | Jaicel | Huascar | Manuel |
| 2 | Jaicel | Huascar | Manuel | Leonardo |
| 3 | Huascar | Manuel | Leonardo | Jaicel |
| 4 | Manuel | Leonardo | Jaicel | Huascar |
| 5 | Leonardo | Jaicel | Huascar | Manuel |
| 6 | Jaicel | Huascar | Manuel | Leonardo |
| 7 | Huascar | Manuel | Leonardo | Jaicel |
| 8 | Manuel | Leonardo | Jaicel | Huascar |

### 7.1 Epics de feature → dueño (aplicando la Regla 1 de §6)

| Epic | Sprint de arranque | Asiento | Dueño asignado |
| :--- | :--- | :--- | :--- |
| `frontend/design-system` | 1 | A | Leonardo |
| `frontend/app-shell-and-navigation` | 1 | A | Leonardo |
| `frontend/landing-and-auth-flow` | 1 | B | Jaicel |
| `backend/domain-and-database` | 1 | B | Jaicel |
| `frontend/api-client-and-schemas` | 2 | A | Jaicel |
| `backend/api-gateway` | 2 | B | Huascar |
| `frontend/wardrobe-flow` | 3 | A | Huascar |
| `backend/garment-analysis-service` | 3 | B | Manuel |
| `frontend/outfits-flow` | 4 | A | Manuel |
| `backend/recommender-engine` | 4 | B | Leonardo |
| `backend/vton-pipeline` | 5 | A | Leonardo |
| `frontend/vton-flow` | 6 | A | Jaicel |
| `frontend/profile-flow` | 7 | A | Huascar |

`frontend/api-contract-gaps` (F9) no entra en esta tabla — es gobierno/gaps, tratado como epic transversal (Regla 2, lista Architecture → Asiento D por historia).

## 8. Notas de asignación (histórico — decisión ya tomada arriba)

Reemplaza "Persona 1-4" de §2 por nombres reales considerando:
- Quién tiene más afinidad con TypeScript/Next.js → tiende mejor a Asientos A/B en sprints de frontend (1, 2, 3, 4, 6, 7).
- Quién tiene más afinidad con Python/ML → tiende mejor a Asientos A/B en sprints de backend/ML (2, 3, 4, 5, 6, 7).
- El Scrum Master (Manuel) es candidato natural recurrente a Asiento D (coordinación + infra ya se solapan en responsabilidad).
- Nadie debería estar en Asiento C dos sprints seguidos sin haber pasado por A/B — rompe la calibración de "quien prueba entiende lo que construyó alguien más", que es el punto del rezago deliberado.
