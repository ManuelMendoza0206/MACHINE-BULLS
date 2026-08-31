# Sprint 1 (26 ago - 8 sep 2026) — Tareas por Rol

**Ventana:** 26 agosto 2026 – 8 septiembre 2026 (2 semanas)  
**Total de tareas:** 38 + 3 epics = 41  
**Equipos:** Leonardo (Seat A / Feature Lead), Jaicel (Seat B / Feature Support), Huascar (Seat C / QA), Manuel (Seat D / Infra/Release)

---

## ASIENTO A — Leonardo (14 tareas)

**Épics principales:** `frontend/design-system`, `frontend/app-shell-and-navigation`

### [EPIC] frontend/design-system
- **ID:** 86e301dd5 | **Due:** 07-09-2026

Tareas del epic:

1. **`tailwind.config.ts` deriva sus colores de `src/config/design-tokens.ts`, sin hardcoding**
   - ID: `86e301dd8` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

2. **Todos los pares texto/fondo de §2.1 pasan el test de contraste AA en ambos temas**
   - ID: `86e301dda` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

3. **`cn()` implementado y cubierto por tests unitarios (mínimo 4 casos: merge simple, conflicto, array, undefined)**
   - ID: `86e301ddf` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

4. **Los 8 componentes de §2.4 existen en `src/components/ui/`, tipados sin `any`, con Storybook**
   - ID: `86e301ddn` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

5. **Cambio de tema claro/oscuro no produce parpadeo visible (`suppressHydrationWarning` en `<html>`)**
   - ID: `86e301ddw` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

6. **`npm run typecheck && npm run lint && npm run test` pasan en verde para todo el design-system**
   - ID: `86e301ddy` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

7. **Los 6 requisitos de accesibilidad de §2.5 están cubiertos por un test cada uno**
   - ID: `86e301de2` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

### [EPIC] frontend/app-shell-and-navigation
- Epic contenido (sin ID separado en este dump)

Tareas del epic:

8. **`AppProviders` instancia cada provider exactamente una vez por sesión**
   - ID: `86e301dp5` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

9. **`TopNav`/`BottomTabBar` alternan visibilidad solo por CSS — cero JS de detección de breakpoint**
   - ID: `86e301dp7` | Due: 07-09-2026
   - List: Build | Owner: Leonardo

10. **Navegación activa usa `aria-current="page"` y señal visual no solo de color**
    - ID: `86e301dp8` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

11. **`GlobalError` cubre los 5 casos de la tabla de tipos de error, cada uno con fallback UI**
    - ID: `86e301dpf` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

12. **`SkipToContentLink` funcional por teclado, primer elemento enfocable**
    - ID: `86e301dpk` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

13. **Cambiar de tema no produce parpadeo visible a nivel de layout completo**
    - ID: `86e301dpm` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

14. **Cobertura de tests ≥ 80% en `src/components/shell/` y `src/app/providers.ts`**
    - ID: `86e301dpw` | Due: 07-09-2026
    - List: Build | Owner: Leonardo

---

## ASIENTO B — Jaicel (16 tareas)

**Épics principales:** `frontend/landing-and-auth-flow`, `backend/domain-and-database` (parte 1)

### [EPIC] frontend/api-client-and-schemas (soporte)
- **ID:** 86e301de4 | **Due:** 07-09-2026
- Nota: Jaicel lidera este epic en Sprint 1 por la importancia de tener schemas alineados desde el inicio

Tareas del epic:

1. **`apiRequest<T>` implementado en `src/lib/api/client.ts` cumpliendo los 7 puntos de §2.2**
   - ID: `86e301de7` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

2. **Jerarquía de errores de §2.1 implementada exactamente como en `CLAUDE.md` §3.3**
   - ID: `86e301dea` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

3. **Los 4 schemas de §2.3 existen, tipados sin `any`, exportando su `z.infer` como tipos**
   - ID: `86e301dec` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

4. **`category` (Garment) y `aesthetic` (Outfit) permanecen como `z.string()` con documentación de valores**
   - ID: `86e301dee` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

5. **`OutfitPositionSchema` y `VtonJobStatusSchema` son `z.enum` cerrados**
   - ID: `86e301dem` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

6. **`VtonJobStatusResponseSchema` tiene un `.refine()` probado que exige `result` cuando status=success**
   - ID: `86e301deq` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

7. **Las 4 funciones de dominio de §2.4 implementadas, sin lógica más allá de int** [data transformation]
   - ID: `86e301det` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

8. **Cobertura de tests ≥ 90% para `src/lib/api/`, `src/lib/errors.ts` y `src/schemas/`**
   - ID: `86e301dev` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

9. **Los fixtures JSON de §2.5 son la única fuente de datos de prueba reutilizado en unit + e2e**
   - ID: `86e301dex` | Due: 07-09-2026
   - List: Build | Owner: Jaicel

10. **`npm run typecheck && npm run lint && npm run test` pasan en verde**
    - ID: `86e301dfb` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

### [EPIC] frontend/landing-and-auth-flow
- Tareas de auth (mayor riesgo de seguridad - ver abajo con Huascar)

11. **`npm run typecheck && npm run lint && npm run test && npm run test:e2e` pasan en verde**
    - ID: `86e301dnp` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

### [EPIC] backend/domain-and-database (parte 1)
- **Nota:** Jaicel lidera las historias de Sprint 1 de este epic

12. **Los 6 modelos SQLAlchemy (User, Garment, GarmentOwnership, Outfit, OutfitGarment, VTONJob) existen con exactamente los campos definidos, sin columnas no autorizadas**
    - ID: `86e3122fr` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

13. **Los schemas Pydantic coinciden campo a campo con los Zod de api-client-and-schemas/spec.md**
    - ID: `86e3122fv` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

14. **Migración Alembic upgrade/downgrade simétrica, verificada en CI**
    - ID: `86e3122fy` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

15. **Trigger on_auth_user_created implementado y verificado (éxito y fallo transaccional)**
    - ID: `86e3122g5` | Due: 07-09-2026
    - List: Build | Owner: Jaicel

---

## ASIENTO C — Huascar (2 tareas principales + apoyo a B en auth)

**Función:** QA & Validación (validar Sprint 0) + Refuerzo en seguridad (landing-and-auth-flow)

### [EPIC] Q1 — Test Automation (cobertura mínima)

1. **Gate de cobertura mínima por spec (80-90% según corresponda) enforced en CI**
   - ID: `86e302a2n` | Due: 07-09-2026
   - List: QA | Owner: Huascar

2. **Visual regression testing sobre los 8 componentes base del design-system (h**[eader, button, card, etc.]
   - ID: `86e302a2b` | Due: 07-09-2026
   - List: QA | Owner: Huascar

### Apoyo a Jaicel — landing-and-auth-flow (par programador de seguridad)

**Nota:** Huascar actúa como tercer par en la tarea de mayor riesgo del sprint (autenticación). No valida Sprint 0 en este ciclo (ver §4.3 de team-rotation-plan.md). El enfoque es pair programming defensivo en auth.

---

## ASIENTO D — Manuel (6 tareas)

**Función:** Infra/MLOps/Release/Documentación

### [EPIC] Deploy / CI-CD — Sprint 0-1
- **ID:** 86e301e00 | **Due:** 07-09-2026

Tareas del epic:

1. **Pipeline GitHub Actions: lint->typecheck->test->build en cada PR; +e2e+deploy a staging**
   - ID: `86e301e09` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

2. **Logging estructurado + tracking de errores (Sentry tier gratuito) desde el inicio**
   - ID: `86e301e0m` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

3. **Auditoría de dependencias (npm audit / pip-audit) integrada al pipeline CI**
   - ID: `86e301e0t` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

### [EPIC] Q4 — Observabilidad (SLOs, Dashboards, Alerting)

4. **Dashboards de latencia y tasa de error por endpoint, con foco en `/api/v1/vton/try-on`**
   - ID: `86e302a5f` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

5. **Definir y documentar SLOs formales: p95 de latencia VTON, uptime objetivo d**[el proyecto]
   - ID: `86e302a5u` | Due: 07-09-2026
   - List: Deploy | Owner: Manuel

### [EPIC] Q6 — Release Management & Documentación

6. **Changelog versionado (formato Keep a Changelog) mantenido desde el primer release**
   - ID: `86e302a7u` | Due: 07-09-2026
   - List: Reportes | Owner: Manuel

---

## Verificación de Completitud

| Rol | Count | Asignado | Pendiente |
| --- | --- | --- | --- |
| **Asiento A (Leonardo)** | 14 | ✅ | 0 |
| **Asiento B (Jaicel)** | 16 | ✅ | 0 |
| **Asiento C (Huascar)** | 2 + pair | ✅ | 0 |
| **Asiento D (Manuel)** | 6 | ✅ | 0 |
| **Epics** | 3 | ✅ | 0 |
| **TOTAL** | **41** | **✅** | **0** |

---

## Notas de Implementación

- **No hay tareas sin asignar** en Sprint 1 (100% cobertura de asignación)
- **Todas las tareas tienen fecha clara** (07-09-2026 = fin de Sprint 1)
- **Épics de feature son "en bloques"**: Leonardo lidera 2 épics (design-system, app-shell); Jaicel lidera 3 (api-client, landing-auth, domain-db); Huascar refuerza seguridad; Manuel coordina infra
- **No hay validación de Sprint 0 en Sprint 1** (Huascar enfocado en cobertura + pair en auth, no en regresión)
- **Documentación lista para ejecutar** — cada rol tiene su lista de tareas con IDs de ClickUp para referencia directa

