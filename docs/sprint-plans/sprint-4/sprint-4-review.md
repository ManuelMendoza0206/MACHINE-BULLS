# Sprint 4 — Review (Asiento C / QA)

**Autor:** Jaicel Velasco — Asiento C de Sprint 4 (`team-rotation-plan.md` §7).
**Ventana del sprint:** 7 – 20 oct 2026. **Documento vivo** — se actualiza en cada revisión de
PR, no de una sola vez al cierre. Última actualización: **8-oct-2026, día 2 de sprint.**

---

## 1. Qué me toca validar este sprint

Por `team-rotation-plan.md` §3 y §7, el Asiento C de Sprint 4 valida **Sprint 3**:

| Epic de Sprint 3 | Dueño | Estado en `main` al 8-oct |
|---|---|---|
| `frontend/wardrobe-flow` | Huascar (A) | En `main` vía PR #32 (mergeado 24-sep) |
| `backend/garment-analysis-service` | Manuel (B) | **Sin PR** — sigue en `to do` |

Además reviso, como parte normal del asiento, los PRs que entran al sprint.

**Contexto heredado de Sprint 3:** Sprint 3 cerró (6-oct) **sin que su review formal quedara
mergeada** — el documento de Leonardo (`sprint-3-review.md`) estuvo abierto del 24 al 8-oct.
Ver §4: el cierre de Sprint 3 quedó trunco y hay trabajo de QA heredado sin absorber.

## 2. PRs revisados y mergeados en Sprint 4

| PR | Autor | Contenido | Veredicto | Merge |
|---|---|---|---|---|
| #35 | Leonardo | `sprint-3-review.md` actualizado al 25-sep + auditoría del PR #34 | ✅ APPROVE | `524a7b3` |
| #36 | Huascar | ADR-008 (paleta WCAG AA) + ADR-009 (CSP baseline) + §4 de la review de Sprint 1 | ✅ APPROVE | `9a50b0b` |

### 2.1 #35 — `sprint-3-review.md` de Leonardo

Documentación pura, +48/-9, sin impacto en runtime. Auto-mergea limpio.

El valor real del PR es la **nota de proceso** que Leonardo agrega: deja por escrito que la QA de
turno **no** aprobó #24, #25, #32, #33 — los aprobó Jaicel. Reconoce la desviación de proceso
("revisor ≠ autor", no bloqueante) en lugar de embarrarla. Es la trazabilidad que pide
`constitution.md` §3.

La §3.1 audita el PR #34 de Huascar con evidencia y sin inflar el resultado: 2 hallazgos reales
(`src/proxy.ts` sin test, política de contraseña `min(8)` vs. el checklist que pedía 12+) y una
cifra previa ("88 tests / 97.9%") dejada **explícitamente como no confirmada**. Reportar lo que
no se pudo validar es parte del trabajo, no una debilidad.

### 2.2 #36 — ADR-008 y ADR-009 de Sprint 1 (Huascar)

Documentación pura, 3 archivos. Llegó `CONFLICTING` y requirió rebase (§3).

**Verificación contra el código, no por autoridad.** Contrasté cada afirmación de las ADRs:

- **ADR-008** — los 4 hex citados (`#52525B`, `#15803D`, `#B45309`, `#B91C1C`) coinciden
  **exactamente** con `frontend/src/config/design-tokens.ts` en `main`.
- **ADR-009** — la CSP descrita coincide con `frontend/next.config.js` línea por línea,
  **incluido el comentario en el código que explica el porqué**.
- Los 3 commits citados (`f4f5a3a`, `9366b6d`, `5333dd8`) **existen**, con fecha y contenido
  coherentes con lo declarado.

Las secciones "Alternativas" de ambas ADRs dicen explícitamente que no hay evidencia de que se
haya considerado una alternativa real, y lo documentan así en vez de inventar un "se consideró y
se descartó" que no ocurrió. La ADR-009 sí documenta la alternativa que realmente se evaluó
(nonce + `strict-dynamic`) y la deja como *follow-up* **abierto**, no como decisión cerrada.
Honesto en las dos direcciones — el estándar de QA que el proyecto necesita.

## 3. Resolución de conflictos del #36

El rebase sobre `main` encontró **dos** archivos en conflicto (uno no era obvio):

1. **`sprint-1-review.md`** — §4 "ADRs escritas este cierre". `main` decía "Ninguna todavía —
   pendiente"; el PR documenta las 2 ADRs. **Gana el PR** — única versión que refleja la
   realidad.

2. **`sprint-3-review.md`** — conflicto add/add **inesperado**: el PR arrastra el commit
   `d3212a4` (#33), pero #35 ya había mergeado una versión **del 25-sep** del mismo archivo.
   **Gana `main`** — la del 25-sep es posterior y más completa (auditoría del PR #34 + tabla de
   ClickUp). La de la rama era del 24-sep; darle la razón al PR habría **regresado** el
   documento.

Diff final: 3 archivos, +97/-5, sin marcadores residuales. `sprint-3-review.md` queda en su
versión del 25-sep.

## 4. Hallazgos de Sprint 4 — día 2 (esto necesita decisión del equipo)

### 4.1 `main` no tiene branch protection — el hallazgo más serio

`GET /repos/ManuelMendoza0206/MACHINE-BULLS/branches/main/protection` → **404**.
`GET /repos/ManuelMendoza0206/MACHINE-BULLS/rulesets` → **`[]`**.

`constitution.md` §3 dice "Rama `main` protegida: prohibidos los commits directos". **Nada lo
está aplicando.** Los 5 colaboradores tienen `push` sobre `main` y ninguno tiene una regla que
los frene. Un `git push` directo a `main` pasa sin rechazo y sin CI.

**Evidencia de que esto ya costó algo:** el PR #31 se mergeó **sin ninguna review registrada**
(`reviews: []`) — la aprobación ocurrió, pero fuera de GitHub y por lo tanto fuera del registro
auditable que la constitución exige. No es teórico: ya pasó una vez este sprint.

**Dueño:** Manuel (único admin). Requiere decisión del equipo: activar la protección con
`required_pull_request_reviews` (1 revisor) o, mínimo, un `ruleset` que bloquee pushes directos.

### 4.2 Hay un 5º colaborador que no está en el charter

`oviroger` figura en la lista de colaboradores del repo con permisos `push` y `triage`. El
charter (`team-rotation-plan.md`) define 4 integrantes y `constitution.md` §3 define 4 puestos.
Nadie sabe quién es ni por qué tiene escritura sobre `main` — que es justamente lo que §4.1
deja abierto.

### 4.3 El cierre de Sprint 3 quedó trunco

`sprint-3-review.md` existió en abierto del 24-sep al 8-oct (15 días) sin mergearse, y su §6
lista 6 pendientes que nunca se cerraron — incluido **Q5 (consentimiento y retención de fotos)**,
que `sprint-3-manifest.md` §4 marca como **tarea crítica del sprint** y "sin relevo a mitad".

Como soy el QA de Sprint 4, heredo formalmente esa validación. **No la he ejecutado** — este
documento cubre solo los PRs del día 2. Queda como el trabajo de QA más grande de este sprint.

### 4.4 `backend/garment-analysis-service` sigue sin PR

Epic de Sprint 3, Asiento B (Manuel). Sin PR al 8-oct. Incluye la Tarea 0.5 de persistencia
mínima que su spec exige (ver `INTEGRATION-DIAGNOSIS-2026-09-18.md`).

## 5. Estado de los PRs abiertos al 8-oct

| PR | Autor | Estado | Quién puede aprobar |
|---|---|---|---|
| #37 | Jaicel | ✅ CLEAN | **Manuel / Leonardo / Huascar** — no puedo (soy el autor) |
| #38 | Jaicel | ❌ CONFLICTING | **Alguien más** + rebase previo |
| #39 | dependabot | ✅ CLEAN | **Yo** |
| #40 | Jaicel | ✅ CLEAN | **Alguien más** (asignado: Leonardo) |

**Limitación estructural:** GitHub rechaza con `422 Can not approve your own pull request` la
auto-aprobación. 4 de los 7 PRs abiertos al inicio del sprint eran míos, así que la mitad de la
carga de aprobación no puede caer en el QA de turno por diseño, no por falta de disposición.

### Pendientes técnicos que bloquean merge

- **#38** — `.python-version`: `main` fijó **3.12** (vía #31); la rama pide **3.13**. El
  auto-merge va a descartar 3.13 en silencio. Hay que decidirlo explícitamente y regenerar
  `uv.lock` si se cambia.
- **#40** — declara **~70% de asistencia IA**, por encima del máximo de 60% que fijó el equipo.
  Corregir antes del merge.

## 6. Pendientes de Sprint 4

- [ ] Validar Sprint 3 formalmente: `wardrobe-flow` (Huascar) y `garment-analysis-service`
      (Manuel) — §4.3 y §4.4
- [ ] Mergear #39 (único approvable por mí de los que quedan)
- [ ] Rebase de #38 + decisión de `.python-version` (§5)
- [ ] Corregir la declaración de IA de #40 a ≤60% (§5)
- [ ] Coordinar con Manuel/Leonardo/Huascar las 3 aprobaciones que no puedo dar (§5)
- [ ] Decisión del equipo sobre branch protection de `main` (§4.1)
- [ ] Aclarar quién es `oviroger` y por qué tiene `push` sobre `main` (§4.2)
- [ ] Follow-up de la ADR-009 (`nonce` + `strict-dynamic` en rutas autenticadas) — sin dueño
- [ ] Handoff de fin de sprint para quien valide Sprint 4 en Sprint 5