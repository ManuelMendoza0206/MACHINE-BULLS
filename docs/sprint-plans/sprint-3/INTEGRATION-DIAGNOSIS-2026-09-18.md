# Sprint 3 — Diagnóstico de integración (18-sep-2026, previo al kickoff del 23-sep)

**Autor:** Leonardo Ibarra López (Asiento C, Sprint 3 — valida Sprint 2).
**Método:** exploración directa del código real en `main` (no de lo declarado en ClickUp/PRs),
cruzado contra `openspec/specs/`, `team-rotation-plan.md` y `api-contract-gaps/spec.md`.

Este documento existe porque el plan de Sprint 3 (`sprint-3-manifest.md`, escrito el 17-sep,
antes de que Sprint 2 cerrara) asume un punto de partida que **no se cumplió**. Antes de que el
equipo entre al kickoff del 23-sep, hay que decidir cómo se ajusta el alcance — no descubrirlo
a mitad de sprint, como ya pasó dos veces en este proyecto (design-system duplicado, P0#3).

---

## 1. Hallazgo central: el backend sigue siendo un esqueleto vacío

`backend/src/` tiene exactamente 6 archivos, todos `__init__.py` vacíos. El único commit que
tocó `backend/` en toda la historia del repo es `6455d6a` (la restructura a monorepo, 3-sep).
**Ni `domain-and-database` ni `api-gateway` tienen una sola línea de código real**, a pesar de
que el plan de Sprint 2 (`sprint-2-manifest.md`) los asignaba a Huascar como "cierre" y "base"
respectivamente, y de que ambos epics siguen en ClickUp en `planning`.

**Consecuencia verificada contra `openspec/specs/frontend/api-contract-gaps/spec.md`:** los 5
gaps (G1-G5) siguen los 5 en estado `Pendiente de confirmación con backend` — ninguno cerrado.
Esto incluye G5 (trigger de sincronización `auth.users`↔`User`), que el propio documento marca
como "bloqueante temprano, antes de Fase 1" — y seguimos sin ella entrando a Sprint 3.

### Impacto real en los 4 asientos de Sprint 3 (`sprint-3-manifest.md` §1)

| Asiento | Persona | Epic asignado | ¿Bloqueado por el backend vacío? |
|---|---|---|---|
| A | Huascar | `frontend/wardrobe-flow` | **No** — su spec declara dependencia solo de `design-system` y `api-client-and-schemas` (ambos cerrados). La regla de `api-contract-gaps/spec.md` §1 ("ningún gap se resuelve inventando un contrato... se desarrolla contra mocks MSW") ya cubre este caso — puede y debe avanzar con mocks. |
| B | Manuel | `backend/garment-analysis-service` | **Sí, parcialmente.** La spec (línea 11, 114) exige persistir `processed_image_url` — eso requiere el modelo `Garment` de `domain-and-database` y el endpoint `POST /garments/upload` de `api-gateway`, ninguno existe. La lógica de análisis (rembg + CLIP) puede escribirse y testearse aislada, pero el endpoint end-to-end no, sin antes crear ese mínimo de persistencia. |
| C | Leonardo (yo) | Valida Sprint 2: `api-client-and-schemas` + `domain-and-database` | **El segundo no tiene nada que validar.** `api-client-and-schemas` sí está `complete` y verificado (ver `sprint-2-manifest.md`). `domain-and-database` no tiene código — no hay "validación" posible de algo que no existe; lo correcto es reportarlo como bloqueador abierto, no fabricar una validación. |
| D | Jaicel | Q5 (consentimiento/retención) + pagination del gateway | **La pagination del gateway sí está bloqueada** — no hay gateway sobre el cual paginar nada todavía. Q5 (diseño de política + tabla de consentimiento) no depende del backend existente, puede avanzar en paralelo. |

---

## 2. Hallazgos secundarios de higiene — de los PRs #20-23 recién mergeados

Verificados por tamaño/contenido real, no por el título del commit:

- **`pose_landmarker_full.task` (9.0 MB) committeado directo al repo, sin Git LFS.** Es un
  modelo binario de MediaPipe para detección de pose — infla el historial de git de forma
  permanente para todo el equipo en cada `git clone`. Debería descargarse en tiempo de
  ejecución/setup (`pip`/script de setup), o vivir en Git LFS si tiene que versionarse.
- **`requirements.txt` en la raíz (128 líneas) es un volcado de `pip freeze` de un entorno de
  notebook** (incluye `argon2-cffi`, `beautifulsoup4`, `bleach` — dependencias de Jupyter, no
  del backend). Coexiste sin relación declarada con `backend/pyproject.toml`, que sí es un
  archivo de dependencias curado. Dos fuentes de verdad de dependencias Python sin resolver
  cuál manda.
- **`sample_data/usuario_apose.jpg`** en la raíz — dato de prueba de un notebook, sin relación
  declarada con `tests/fixtures/` del resto del proyecto.

Ninguno de estos 3 bloquea Sprint 3 funcionalmente, pero son deuda que crece si no se atiende
— cada sprint que pasa sin resolverlos, más difícil se vuelve deshacerlos (sobre todo el
binario en git history).

---

## 3. Planteamiento de integración — qué hacer con esto, siguiendo SDD

**Principio rector (`CLAUDE.md` §3):** ningún código funcional sin spec. Los gaps abiertos ya
están especificados (`api-contract-gaps/spec.md`) — lo que falta no es especificación, es
implementación. No se resuelve inventando código apurado a mitad de Sprint 3; se resuelve
decidiendo ahora, antes del kickoff, quién cierra qué y en qué orden.

### 3.1 Recomendación para Manuel (Asiento B) — antes de escribir `garment-analysis-service`

Su Tarea 0 (ya en `sprint-3-init-manuel.md`) debe ampliarse: antes de la lógica de análisis,
implementar el **mínimo de persistencia** que su propia spec exige (línea 114): el modelo
`Garment` (subconjunto de `domain-and-database`, solo lo que él necesita, no los 6 modelos
completos) + un endpoint mínimo de `api-gateway` que lo expone. Esto es defendible dentro de
su propio sprint porque es exactamente lo que su spec pide para cerrar — no es "hacer el
trabajo de Huascar", es "el mínimo de dominio que mi propia feature necesita para no mentir
sobre estar completa".

**Alternativa si el tiempo no alcanza:** dejar la persistencia en `TODO` explícito con un test
que falla intencionalmente (`pytest.mark.skip(reason=...)`) citando el gap — igual al patrón ya
usado en el scaffold E2E de Leonardo (Sprint 2). No fingir con un mock permanente que engañe a
Sprint 4 sobre qué está realmente conectado a datos reales.

### 3.2 Recomendación para Huascar (Asiento A) — sin cambios de fondo

Su plan ya es correcto: `wardrobe-flow` contra mocks MSW documentados, tal como exige
`api-contract-gaps/spec.md`. Único ajuste: cuando conecte el catálogo cápsula (Tarea 3 de su
prompt), debe declarar explícitamente en el código/PR que sigue contra mock (G4 sigue abierto)
— no dar la impresión de estar conectado a datos reales.

### 3.3 Recomendación para mí (Asiento C) — cómo reporto la validación de `domain-and-database`

No lo voy a marcar `complete` ni voy a inventar una validación de código que no existe. Lo
reporto en ClickUp como lo que es: **bloqueador abierto desde Sprint 1**, con el hallazgo de
este documento como evidencia, y lo escalo en el Sprint Review del 23-sep para que el equipo
decida — no es una decisión que me corresponda tomar solo desde Asiento C.

### 3.4 Recomendación para Jaicel (Asiento D) — reordenar, no recortar

Adelantar Q5 (no depende del backend) mientras la pagination del gateway espera a que exista
algo sobre lo cual paginar — coordinarlo con Manuel: en cuanto él tenga el mínimo de
persistencia de 3.1, Jaicel puede paginar sobre ese mismo endpoint en vez de esperar el gateway
completo.

### 3.5 Higiene (no bloqueante, dueño: quien tenga ancho de banda — recomendado Asiento D)

- Mover `pose_landmarker_full.task` fuera de git (script de descarga en setup, o Git LFS si
  debe versionarse) — abrir esto como una tarea de `Q2 — CI/CD` o `Q5 — Seguridad`, no dejarlo
  crecer.
- Consolidar `requirements.txt` de la raíz: si es solo para notebooks, moverlo a
  `notebooks/requirements.txt` y dejarlo fuera de la raíz del repo — separado de
  `backend/pyproject.toml`, que sigue siendo la fuente de verdad del backend real.

---

## 4. Qué NO cambia de `sprint-3-manifest.md`

La tabla de asientos y epics (§1 de ese documento) sigue siendo correcta — este diagnóstico no
reasigna a nadie, solo agrega el mínimo de alcance necesario dentro de cada epic para que sea
honesto con lo que su propia spec exige. El riesgo heredado que ya señalaba ese manifiesto (§3:
"un epic no se da por cerrado hasta que su estado en ClickUp diga `complete` con el link del PR
como evidencia") se confirma con este diagnóstico — `domain-and-database` es el ejemplo vivo de
por qué esa regla existe.
