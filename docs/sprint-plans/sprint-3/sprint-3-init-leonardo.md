# Sprint 3 — Inicialización | Asiento C (Leonardo Ibarra López)

**Rol:** QA & Validación — con rezago de un sprint (valida Sprint 2, no Sprint 3)
**Ventana:** 23 sep – 6 oct 2026
**Qué validas:** `frontend/api-client-and-schemas` (Jaicel, Asiento A Sprint 2),
`backend/domain-and-database` (Huascar, Asiento B Sprint 2, cierre)

> **De Asiento A a Asiento C:** en Sprint 1 construiste (design-system, app-shell). En
> Sprint 2 fuiste Asiento D (infra: registro de modelos, E2E). Ahora te toca validar el trabajo
> de otros — el mismo tipo de revisión rigurosa que en Sprint 2 le pediste a Manuel que hiciera
> con tu propio trabajo. Aplica el mismo estándar.

---

## 🎯 Objetivo de Sprint

Confirmar, con evidencia ejecutada (no leída de un comentario de PR), que el cliente API/schemas
de Jaicel y el modelo de dominio/base de datos de Huascar cumplen sus specs — y dejar un
registro que Jaicel (Asiento D este sprint, ocupado con Q5) y el resto puedan usar sin
reconstruir contexto.

**Antes de empezar:** revisa cómo lo hizo (o no lo hizo) Manuel contigo en Sprint 2
(`sprint-2-init-manuel.md`) — si él dejó comentarios de validación claros en tus epics, úsalos
como plantilla; si no dejó nada (posible, según la auditoría del 17-sep), no repitas ese vacío.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Reconstruir qué se mergeó en Sprint 2 — 0.5 días

1. `git log main --oneline` desde el cierre de Sprint 1 — identifica los PRs de Jaicel
   (`api-client-and-schemas`, cierre) y Huascar (`domain-and-database`, cierre +
   `api-gateway`, base).
2. Lee el handoff que cada uno dejó en su epic (regla §4.1 del plan de rotación) — si no
   dejaron nada, es un hallazgo en sí mismo, regístralo antes de empezar a validar a ciegas.

**Aceptación:**
- [ ] Lista de PRs de Sprint 2 con su epic correspondiente y si hubo handoff o no

---

### Tarea 1: Validar `frontend/api-client-and-schemas` (Jaicel) — 1.5 días

**Spec:** `openspec/specs/frontend/api-client-and-schemas/spec.md` — 2 Requirements
("Validación obligatoria de toda respuesta de red", "Errores tipados por clase, nunca
genéricos").

1. Para cada función de fetch en `src/features/*/api/*.ts`: confirma que parsea con Zod antes
   de devolver — busca literalmente cualquier `as` sobre el resultado de `fetch`/`response.json()`
   sin pasar por `safeParse` primero.
2. Fuerza un caso de error real (respuesta con campo faltante, mock de 404, mock de red caída)
   y confirma que sale la subclase correcta de `StyleMeError` — no lo des por sentado leyendo
   el código, ejecútalo.
3. Revisa que ningún hook de TanStack Query tenga `catch (e) { console.log(e) }` sin relanzar.

**AC:**
- [ ] Los 2 Requirements verificados con test ejecutado, no solo código leído
- [ ] Cualquier gap encontrado → comentario específico en el epic con el archivo y línea exacta
- [ ] Epic movido a `complete` (si pasa) o `update required` con motivo preciso

---

### Tarea 2: Validar `backend/domain-and-database` (Huascar) — 2 días

**Spec:** `openspec/specs/backend/domain-and-database/spec.md` — 5 Requirements.

1. Corre `pytest backend/tests/ -v --cov=src` tú mismo — no confíes en el número reportado en
   el PR, reprodúcelo.
2. Verifica el trigger de identidad (`on_auth_user_created`, el más crítico de Sprint 2 por
   regla §4.4) — prueba el camino de fallo transaccional manualmente si el test no lo cubre de
   forma convincente.
3. Corre la migración Alembic `upgrade` y luego `downgrade` en un entorno limpio — confirma que
   es simétrica de verdad, no solo que el PR dice que lo es.
4. Revisa el seed del catálogo cápsula: ¿la "cobertura mínima verificable" tiene un test que
   realmente falla si la cobertura baja, o es solo un conteo de filas insertadas?

**AC:**
- [ ] Los 5 Requirements verificados con comandos ejecutados por ti, con output pegado en el
      comentario del epic
- [ ] Trigger de identidad probado en su camino de fallo, no solo el de éxito
- [ ] Epic movido a `complete` o `update required` con motivo preciso

---

### Tarea 3: Cerrar la brecha de gobernanza si se repite — 0.5 días

Si al llegar a este sprint los epics de Sprint 1 (`design-system`, `app-shell-and-navigation`,
`landing-and-auth-flow`) **siguen** sin estar en `complete` en ClickUp (es decir, Manuel no
cerró su Tarea de Sprint 2), esto ya es un patrón de 2 sprints seguidos — la regla §5 del plan
de rotación dice: si el handoff se pierde 2 sprints seguidos, se ajusta el ciclo de rotación
(ej. cada 2 sprints en vez de cada 1) antes de seguir forzando el patrón actual.

**AC:**
- [ ] Si aplica: levantar esto explícitamente en el Sprint Review del 7-oct, con los datos
      concretos (qué epics, cuántos sprints sin cerrar)

---

## ⏱️ Cronograma (23 sep – 6 oct, 14 días)

| Días | Fechas | Tarea |
|---|---|---|
| 1 | 23 sep | Tarea 0 (reconstruir) |
| 2-5 | 24-27 sep | Tarea 1 (api-client-and-schemas) |
| 6-9 | 28 sep - 1 oct | Tarea 2 (domain-and-database — la más pesada) |
| 10-14 | 2-6 oct | Tarea 3 si aplica, buffer, handoff para Sprint 4 |

---

## ✅ Definition of Done

- [ ] Los 2 epics de Sprint 2 con comentario de validación ejecutado (comandos reales, no
      lectura de código)
- [ ] Cada uno movido a `complete` o `update required` con motivo específico
- [ ] Patrón de 2 sprints sin cierre (si aplica) levantado en retrospectiva
- [ ] Handoff dejado para quien valide tu propio trabajo de infra de Sprint 2 (Q1/Q3) en
      Sprint 4

---

## 🤝 Pair Sessions

- **Tarea 1:** Jaicel, si algo no cuadra — 20 min antes de marcar `update required`.
- **Tarea 2:** Huascar, ídem, especialmente para el trigger de identidad.
- Responde en retrospectiva: "¿algo se perdió en el handoff de este ciclo?" — con datos
  concretos de si Jaicel/Huascar dejaron o no el comentario de fin de sprint.
