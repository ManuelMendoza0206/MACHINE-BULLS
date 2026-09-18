# Sprint 1 — Prompt de Inicialización | Asiento C (Huascar)

**Rol:** QA & Validación — Coverage Gates + Auth Security Pair  
**Ventana:** Sprint 1 features **2–8 sep 2026** (Sprint 0 cerró el 1 sep)  
**Epics:** Q1 (Test Automation), frontend/landing-and-auth-flow (support)  
**2 tareas + pair** | SP ~20-25 — ver `sprint-1-manifest.md` §5.  
**Contexto:** Sin sprint previo que validar; Huascar refuerza auth como tercer par y monta los gates de cobertura.

> **Ajustes post-scaffold** (`sprint-1-manifest.md` §5): visual regression sobre **5** componentes
> (Button, Card, Badge, Skeleton, Progress), no 8. Gate de cobertura: **setup** en Sprint 1,
> **enforcement como merge-gate** en Sprint 2 (P1#8). Requiere `CODECOV_TOKEN` (secreto — Manuel).

---

## Objetivo de Sprint

Asegurar **calidad de pruebas y seguridad en auth**, entregando:
- Coverage gates automáticos en CI (80-90% según spec)
- Visual regression baselines para 8 componentes del design-system
- Pair programming defensivo en landing-and-auth-flow (Leonardo + Jaicel + Huascar)
- Test framework listo para validación de Sprint 1

**Success Criteria (DoD):**
- ✅ 2 tareas principales pasan (coverage gate + visual regression)
- ✅ Pair con Jaicel en auth identifica 3+ edge cases de seguridad (session hijacking, CSRF, etc)
- ✅ Coverage gates ejecutan en CI y fallan si cobertura cae
- ✅ Visual regression baselines establecidas y commiteadas
- ✅ Accesibilidad validada en design-system (axe-core, no violaciones)

---

## Tareas por Orden de Ejecución

### Tarea 1: Coverage Gate Enforcement (días 1-7)

**ID:** `86e302a2n`
- **Título:** Gate de cobertura mínima por spec (80-90% según corresponda) enforced en CI

**Descripción & Acceptance:**

Este es el "canario en la mina" de calidad. Implementar un paso en CI que:

1. **Ejecutar `npm run test -- --coverage`** (frontend)
   - Output: JSON coverage report
   - Targets por spec:
     - `src/components/shell/`: ≥80% (app-shell-and-navigation/spec.md §2.6)
     - `src/components/ui/`: ≥80% (design-system/spec.md §2.6)
     - `src/lib/api/`: ≥90% (api-client-and-schemas/spec.md §2.6)
     - `src/lib/errors.ts`: ≥90%
     - `src/schemas/`: ≥90%

2. **Ejecutar `pytest tests/ --cov=src/domain --cov-report=json`** (backend)
   - Target: `src/domain/`: ≥90%

3. **Lógica de gate:**
   - Si algún path cae bajo su target → CI job FALLA con mensaje claro (qué path, qué coverage tiene, qué necesita)
   - Mensaje: `Coverage FAIL: src/lib/api/ has 85.2% but requires 90% — missing 47 lines`
   - No permite merge sin arreglarlo

4. **Implementación técnica:**
   - Script `.github/workflows/coverage-gate.yml` que:
     - Instala dependencias
     - Corre tests con coverage
     - Parsea JSON output
     - Compara contra thresholds
     - Exit con código 1 si FAIL
   - Frontend: use `nyc` (o vitest built-in coverage)
   - Backend: use `pytest-cov`

**Aceptación Detallada:**

- [ ] Workflow `.github/workflows/coverage-gate.yml` existe y ejecuta en cada PR
- [ ] Mensaje FAIL es legible (incluye path exacto, % actual, % requerido)
- [ ] Mensaje SUCCESS confirma "Coverage OK: X paths verified"
- [ ] Test: crear PR con missing coverage (ej: tarea sin test) → gate FALLA
- [ ] Test: arreglar tarea → gate PASA
- [ ] Workflow no timeout (< 5 min frontend + < 2 min backend)
- [ ] Coverage reports guardados como artifacts en GitHub (para inspeccion post-run)

**Dependencia de:** Leonardo (tests escritos), Jaicel (tests escritos)  
**Bloqueador para:** Sprint 2 CI (gate debe estar listo antes de que otros PRs cierren)  
**Duración estimada:** 2-3 días (includes debugging)

---

### Tarea 2: Visual Regression Baselines (días 3-7)

**ID:** `86e302a2b`
- **Título:** Visual regression testing sobre los 8 componentes base del design-system

**Descripción & Acceptance:**

Capturar y versionar screenshots de referencia para evitar UI regressions accidentales.

1. **8 Componentes a Baselines:**
   - Button, Card, Input, Select, Modal, Badge, Tooltip, Spinner
   - Cada uno en: claro theme (1x) + oscuro theme (1x) = 16 baselines

2. **Captura técnica (Playwright):**
   ```ts
   // tests/visual-regression/components.spec.ts
   test('Button baseline — light theme', async ({ page }) => {
     await page.goto('/storybook/?theme=light&component=Button');
     await expect(page.locator('.storybook-component')).toHaveScreenshot('button-light.png');
   });
   ```

3. **Baseline Storage:**
   - Directorio: `tests/visual-regression/baselines/`
   - Formato: PNG (máx calidad)
   - Commiteados a git (no .gitignore)
   - Nombres: `{component}-{theme}.png` (ej: `button-light.png`)

4. **CI Regression Detection:**
   - En cada PR, Playwright re-captura y compara contra baselines
   - Diff threshold: ≤2% pixel differences permitido (small anti-alias diffs OK)
   - Si diff > 2%: test FALLA, artifact con diff marked (expected vs. actual vs. diff overlay)
   - Diff image guardado en GitHub artifacts para review

5. **Workflow:**
   - `.github/workflows/visual-regression.yml` ejecuta:
     - `npm run test:visual` (Playwright visual tests)
     - Compara contra baselines
     - Upload artifacts si fallan

**Aceptación Detallada:**

- [ ] 16 baseline PNG files existen en `tests/visual-regression/baselines/`
- [ ] Cada baseline es ≤500KB (bien comprimido)
- [ ] Baselines están commiteados a git
- [ ] Workflow `.github/workflows/visual-regression.yml` existe
- [ ] Test local: `npm run test:visual` pasa (no diffs)
- [ ] Test: modificar Button CSS (ej: cambiar padding) → visual test FALLA, diff artifact generado
- [ ] Mensaje FAIL muestra diff visualmente (expected/actual side-by-side)
- [ ] `npm run test:visual -- --update` permite re-capturar baselines (uso manual solo)

**Dependencia de:** Leonardo (componentes implementados, Storybook setup)  
**Bloqueador para:** Sprint 2 (cualquier cambio en design-system debe pasar visual regression)  
**Duración estimada:** 2 días

---

### Pair Programming: Auth Security (días 4-14)

**Role:** Refuerzo tercero en frontend/landing-and-auth-flow  
**Equipo:** Jaicel (Feature Support, lidera) + Leonardo (support) + Huascar (QA, pair defensivo)  
**Enfoque:** Identificar y mitigar edge cases de seguridad en auth flow

**Escenarios a Validar (Pair Reviews):**

1. **Session Hijacking / Token Theft**
   - Dónde se almacena el token? (nunca localStorage — debe ser secure session/httpOnly cookie)
   - ¿Hay acceso JS al token? (si sí → XSS vulnerability)
   - Test: inyectar XSS en página → verificar que no puede robar token
   - **Action:** Jaicel implementa, Huascar valida con security test

2. **CSRF (Cross-Site Request Forgery)**
   - Sign up/sign in/sign out son POST → necesitan CSRF token
   - Estado inicial: ¿de dónde viene CSRF token? (debe ser del servidor, no predecible)
   - Test: intentar CSRF sin token → debe fallar (403 Forbidden)
   - **Action:** Huascar propone test CSRF, Jaicel verifica que Supabase lo maneja

3. **Timing Attack en Login**
   - Comparación de email/password toma tiempo diferente si user existe vs. no
   - Leaks información ("user not found" vs. "invalid password" = mismo tiempo)
   - Test: medir latencia de "user exists" vs. "user not exists" → deben ser ≈ iguales
   - **Action:** Huascar escribe test, Jaicel verifica que Supabase no tiene leak (probablemente OK, pero validar)

4. **Rate Limiting en Auth**
   - Endpoints `/auth/signup` y `/auth/signin` deben tener rate limit
   - Test: hacer 10 requests en 1s → 11° debe fallar con 429 Too Many Requests
   - **Action:** Manuel (Asiento D) implementa rate limiting, Huascar valida en test

5. **Password Requirements Validation**
   - Contraseña debe cumplir requisitos (mínimo 12 chars, 1 mayúscula, 1 número, 1 special)
   - No se deve revelar cuál requisito falló (timing leak risk)
   - Test: contraseña inválida → error genérico "Password does not meet requirements"
   - **Action:** Jaicel implementa, Huascar valida

6. **Email Verification**
   - Sign up lleva a `/verify-email`
   - No permite login hasta que email esté confirmado
   - Test: signup → intentar login antes de confirmar → debe fallar (403 Unverified)
   - **Action:** Jaicel + Huascar diseñan flujo, Supabase confirmation link maneja

7. **Logout Completeness**
   - Logout limpia token + sesión + cualquier cache local
   - No persiste ningún dato sensible en memory
   - Test: logout → verificar que user data no es accesible (window.user === undefined)
   - **Action:** Jaicel implementa, Huascar valida

8. **OWASP Top 10 Quick Scan**
   - A01:2021 – Broken Access Control: user no puede acceder recurso ajeno (e.g., otro user's outfit)
   - A07:2021 – Identification and Authentication Failures: cobertas por 1-7 arriba
   - A03:2021 – Injection: inputs escapados (no SQL injection ni XSS risk)
   - **Action:** Huascar corre `npm audit`, `npm run lint -- --security`, reporta findings

**Outcome de Pair:**
- [ ] 8 edge cases documentados en `docs/security/auth-threat-model.md`
- [ ] 8 tests escritos (1 por escenario) en `tests/security/auth.spec.ts`
- [ ] Todos los 8 tests pasan
- [ ] No hay findings críticos en OWASP quick scan
- [ ] Pull request aprobado por los 3 (Jaicel, Leonardo, Huascar) antes de merge

**Duración:** Paralelo a las 2 tareas principales, ~5-7 horas de pair time distribuidas a lo largo de Sprint

---

## Hito: QA + Coverage Ready

**Fin de Sprint 1 (día 14):**

Huascar entrega:
- ✅ Coverage gates funcionando en CI (no allow merge si coverage cae)
- ✅ Visual regression baselines para 8 componentes
- ✅ 8 tests de seguridad para auth (edge cases cubiertos)
- ✅ Threat model documentado

**Siguiente:** Sprint 2, Huascar (Asiento D en Sprint 2? No, rotación → Huascar es Asiento C nuevamente). Huascar valida Sprint 1 output (design-system + auth) contra baselines + coverage gates.

---

## Handoff (fin de Sprint 1)

**Comentario en epics:**
- [EPIC] Q1 — Test Automation: "Coverage gate implementado y ejecutando en CI. Baselines visuales establecidas para 8 componentes. Thresholds: 80-90% según spec. No hay deuda técnica."
- [EPIC] frontend/landing-and-auth-flow: "Pair con Jaicel + Leonardo identificó 8 edge cases de seguridad. Todos cubiertos por test. Auth flow ready para validación. Ver `docs/security/auth-threat-model.md`."

---

## Referencia: Coverage Targets por Epic

| Path | Target | Reason |
| --- | --- | --- |
| `src/components/shell/` | ≥80% | app-shell-and-navigation/spec.md §2.6 |
| `src/components/ui/` | ≥80% | design-system/spec.md §2.6 |
| `src/lib/api/` | ≥90% | api-client-and-schemas/spec.md §2.6 — critical path |
| `src/lib/errors.ts` | ≥90% | api-client-and-schemas/spec.md §2.6 |
| `src/schemas/` | ≥90% | api-client-and-schemas/spec.md §2.6 |
| `src/domain/` (backend) | ≥90% | backend/domain-and-database/spec.md §2.6 |

