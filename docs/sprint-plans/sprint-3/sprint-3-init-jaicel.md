# Sprint 3 — Inicialización | Asiento D (Jaicel Velasco)

**Rol:** Infra/Release — Consentimiento/Retención de Fotos (Q5, **crítico**) + Pagination del Gateway
**Ventana:** 23 sep – 6 oct 2026
**Regla de continuidad (`team-rotation-plan.md` §4.4):** Q5 es de importancia crítica —
**llévalo de punta a punta tú mismo dentro de este sprint, sin relevo a mitad de tarea.**

> **De Asiento A a Asiento D:** en Sprint 2 lideraste `api-client-and-schemas`. Este sprint no
> es de features de UI — es diseño de política + hardening del gateway. Coordina con Huascar
> (Asiento A, `wardrobe-flow`) desde el día 1: tu Q5 le bloquea su Tarea 1.

---

## 🎯 Objetivo de Sprint

Dos entregables, el primero bloqueante para el resto del equipo:

1. **Diseño e implementación del mecanismo de consentimiento explícito y política de retención**
   para fotos de prenda y de usuario — sin esto, `wardrobe-flow` (Huascar) y el futuro
   `vton-flow` construyen sobre un supuesto no validado.
2. **Pagination del gateway** — bloqueada hasta que Manuel entregue el mínimo de persistencia
   de su Tarea 0.5 (ver Tarea 4 más abajo); no asumas que Huascar dejó una base de Sprint 2,
   verificado que no la dejó.

---

## ⚠️ Esto no puede esperar al día 3 — coordinación inmediata

Huascar arranca `wardrobe-flow` este mismo sprint y su Tarea 1 (subida por lote) necesita saber
qué consentimiento mostrar **antes de la primera subida de la sesión**. Bloquea 30 min con él
el día 1 del sprint (ver `sprint-3-init-huascar.md` Tarea 0) — aunque tu diseño completo tome
más tiempo, dale un mínimo viable ese mismo día para que no se bloquee.

---

## 📋 Tareas (orden estricto)

### Tarea 0: Mínimo viable de consentimiento para Huascar — día 1 (unas horas)

1. Define, aunque sea en borrador: ¿qué texto de consentimiento se muestra?, ¿se pide una vez
   por sesión o una vez por cuenta?, ¿qué pasa si el usuario no consiente (bloquea la subida
   por completo, o permite navegar sin subir)?
2. Comunica esto a Huascar antes de que termine el día 1 — no lo dejes para cuando tengas el
   diseño "completo".

**Aceptación:**
- [ ] Mínimo viable comunicado a Huascar, por escrito (comentario en su epic o el tuyo)

---

### Tarea 1: Diseño de la política de retención — 2 días

**No hay spec previa de esto en `openspec/specs/` — créala.** Es la primera vez que este tema
se formaliza; sigue el flujo de `CLAUDE.md` §3 (spec antes que código).

1. Define, por tipo de foto (foto de prenda subida al guardarropa, foto de usuario para VTON):
   - Cuánto tiempo se retiene tras la última interacción del usuario con ese dato.
   - Qué pasa si el usuario elimina la prenda/su cuenta — borrado inmediato o periodo de gracia.
   - Dónde vive el registro de consentimiento (tabla en la base de datos — coordina con Huascar
     si necesita un campo en `User` o una tabla aparte, dado que él cerró `domain-and-database`
     en Sprint 2).
2. Redacta `openspec/specs/frontend/wardrobe-flow/spec.md` — o un spec nuevo
   `frontend/photo-consent-and-retention/spec.md` si el alcance no cabe limpio dentro de
   wardrobe-flow — con Requirements formales (consentimiento explícito, retención por tipo de
   dato, borrado en cascada).
3. Documenta la decisión también como ADR (`docs/adr/ADR-008-consentimiento-retención.md`,
   siguiendo el formato de los 7 ADRs existentes) — esto es exactamente el tipo de decisión que
   `docs/risks/RISK-REGISTER.md` ya señala como pendiente ("diseñar mecanismo de consentimiento/
   retención de fotos de usuario — aún sin diseño concreto").

**AC:**
- [ ] Spec formal (nueva o extendida) con Requirements de consentimiento y retención
- [ ] ADR-008 redactado con decisión, alternativas consideradas, consecuencias
- [ ] Entrada correspondiente en `docs/risks/RISK-REGISTER.md` actualizada de "sin diseño" a
      "diseñado, pendiente de implementación" o "implementado"

---

### Tarea 2: Implementación del consentimiento (backend) — 1.5 días

1. Campo/tabla de registro de consentimiento en la base de datos (coordinar con Huascar —
   puede requerir una migración Alembic adicional sobre lo que él cerró en Sprint 2).
2. Endpoint o mecanismo para que el frontend registre el consentimiento del usuario antes de
   la primera subida — Huascar lo consume desde su Tarea 1.

**AC:**
- [ ] Registro de consentimiento persistido, con migración si aplica
- [ ] Contrato confirmado con Huascar (su UI ya lo consume desde el día 1 con el mínimo viable
      de la Tarea 0 — esta tarea formaliza eso, no lo reemplaza a mitad de camino sin avisar)
- [ ] PR revisado y mergeado

---

### Tarea 3: Job de retención/borrado — 1.5 días

1. Mecanismo (job programado, o verificación en cada acceso) que aplica la política de
   retención definida en la Tarea 1 — borrado real de fotos que superaron su periodo, no solo
   la documentación de que "debería pasar".
2. Test que verifica que una foto marcada como vencida efectivamente se elimina (o se marca
   para eliminación, según lo que se haya decidido).

**AC:**
- [ ] Mecanismo de retención implementado y testeado
- [ ] No depende de que alguien lo corra manualmente — es automático según lo diseñado
- [ ] PR revisado y mergeado

---

### Tarea 4: Pagination del gateway — 2 días

**Spec:** `openspec/specs/backend/api-gateway/spec.md` — Requirement "Paginación por cursor en
todos los endpoints de listado".

> **⚠️ Corrección 18-sep:** `GET /api/v1/garments` **no existe** — Huascar no llegó a cerrar
> `api-gateway` en Sprint 2 (verificado: `backend/src/` vacío). Esta tarea queda **bloqueada
> hasta que Manuel (Asiento B) entregue su Tarea 0.5** (mínimo de persistencia +
> `POST /garments/upload`, ver `INTEGRATION-DIAGNOSIS-2026-09-18.md` §3.1/§3.4) — no hay nada
> sobre lo cual paginar antes de eso. **Reordena tu sprint: adelanta Q5 (Tareas 0-3, no
> dependen del backend) y deja esta Tarea 4 para la segunda mitad**, coordinando con Manuel
> cuándo su endpoint mínimo esté listo.

1. Extiende la paginación por cursor al endpoint que Manuel entregue (`GET /api/v1/garments`,
   sobre el modelo `Garment` mínimo de su Tarea 0.5) y a cualquier otro que exista a esta
   altura (outfits, si `outfits-flow`/`recommender-engine` ya expone algo).
2. Si Manuel no llega a tener el endpoint listo dentro del sprint: documenta esta Tarea como
   bloqueada explícitamente (no la fuerces contra un endpoint que no existe) y pásala a
   Sprint 4 junto con el resto de `api-gateway`.
3. Test: un listado con más elementos que el tamaño de página devuelve un cursor válido para la
   siguiente página, y la última página no devuelve cursor.

**AC:**
- [ ] Todos los endpoints de listado que existan al momento usan cursor, no offset/limit
- [ ] Los que aún no existen (incluyendo la posibilidad de que ninguno exista) quedan
      documentados como pendiente explícito, no ignorados ni forzados
- [ ] PR revisado y mergeado, o Tarea formalmente movida a Sprint 4 con motivo

---

## ⏱️ Cronograma (23 sep – 6 oct, 14 días)

| Días | Fechas | Tarea |
|---|---|---|
| 1 | 23 sep | Tarea 0 (mínimo viable para Huascar, urgente) + arranque Tarea 1 |
| 2-3 | 24-25 sep | Tarea 1 (diseño + spec + ADR) |
| 4-6 | 26-28 sep | Tarea 2 (consentimiento backend) |
| 7-9 | 29 sep - 1 oct | Tarea 3 (job de retención) |
| 10-13 | 2-5 oct | Tarea 4 (pagination) |
| 14 | 6 oct | Buffer, handoff |

**No recortes la Tarea 1-3 (consentimiento/retención) por falta de tiempo** — es la crítica de
este sprint. Si algo cede, que sea el alcance de la Tarea 4 (pagination puede dejar 1-2
endpoints para Sprint 4 sin romper nada).

---

## ✅ Definition of Done

- [ ] Spec de consentimiento/retención existe, formal, con Requirements verificables
- [ ] ADR-008 redactado
- [ ] `docs/risks/RISK-REGISTER.md` actualizado (ya no dice "sin diseño concreto")
- [ ] Consentimiento implementado end-to-end (backend + confirmado con el frontend de Huascar)
- [ ] Job de retención implementado y testeado, no solo documentado
- [ ] Pagination extendida a los endpoints existentes
- [ ] `pytest backend/tests/ -v --cov=src` en los módulos tocados
- [ ] Epics movidos a `complete` en ClickUp con evidencia

---

## 🤝 Pair Sessions

- **Tarea 0:** Huascar — 30 min, día 1, no negociable, le bloquea su Tarea 1.
- **Tarea 1-2:** Huascar (esquema de base de datos, dado que él cerró `domain-and-database`).
- Sin relevo a mitad de Q5 (regla §4.4) — si algo no alcanza, se documenta y se retoma tú mismo
  en Sprint 4, no se lo pasas a quien rote a Asiento D después.
