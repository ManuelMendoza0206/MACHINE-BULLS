# CI/CD Quality Gates, Automated Rollback & Deployment Verification

Este documento consolida la arquitectura de puertas de calidad (Quality Gates), pruebas E2E críticas, verificación de presupuestos de rendimiento, y despliegue seguro con rollback automático para **StyleSync IA**.

---

## 1. Puerta de Promoción de Modelo (Model Promotion Gate)
- **Script:** [`scripts/ci/model_promotion_gate.py`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/ci/model_promotion_gate.py)
- **Tarea ClickUp:** `86e302a4q`
- **Fundamento Teórico:** `docs/context/plan-base.md` §9 (Criterios de Evaluación y Métricas Académicas).
- **Umbrales:**
  - $F_1\text{-Macro} \ge 0.82$ para clasificación de categorías funcionales.
  - $F_1\text{-Macro} \ge 0.75$ para clasificación de estéticas contemporáneas.
  - $\text{FITB (Fill-In-The-Blank Accuracy)} \ge 70\%$ en pruebas estándar de compatibilidad.
  - No regresión: $F_{1,\text{candidato}} \ge F_{1,\text{baseline}}$.
- **Comportamiento:**
  - Si el candidato cumple todos los umbrales: Retorna código de salida `0` y genera `docs/ml/model_promotion_decision.json` con `decision: "APPROVED"`.
  - Si no alcanza algún umbral o hay regresión: Retorna código de salida `1` bloqueando el despliegue a producción.

---

## 2. Despliegue con Rollback Automático (Deployment Pipeline with Automated Rollback)
- **Script:** [`scripts/deploy/deploy_manager.py`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/deploy/deploy_manager.py) / [`scripts/deploy/deploy_with_rollback.sh`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/deploy/deploy_with_rollback.sh)
- **Tarea ClickUp:** `86e302a3f`
- **Comportamiento:**
  1. Registra la versión/revisión previa estable.
  2. Ejecuta el comando de despliegue.
  3. Ejecuta sondas de salud (`/health`) con reintentos y retroceso exponencial (exponential backoff).
  4. Ante fallo de salud o agotamiento de reintentos: Activa inmediatamente el rollback hacia la versión estable anterior y emite alerta crítica SRE.
  5. Genera el registro estructurado de auditoría en `docs/ci/deploy_audit.json`.

---

## 3. Pruebas de Humo en Staging (Staging Post-Deploy Smoke Tests)
- **Script:** [`scripts/smoke_tests.py`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/smoke_tests.py)
- **Tarea ClickUp:** `86e302a3q`
- **Sondas Verificadas:**
  1. `backend_health`: `GET /health` -> 200 OK, estado saludable y conexión a base de datos.
  2. `prometheus_metrics`: `GET /metrics` -> 200 OK con métricas `http_requests_total`.
  3. `sre_latency_percentiles`: `GET /metrics/json` -> 200 OK con percentiles p50, p90, p95, p99.
  4. `capsule_catalog`: `GET /api/v1/capsule` -> 200 OK catálogo accesible.
  5. `frontend_web`: `GET /` -> 200 OK y renderizado de documento HTML.
- **Resultado:** Produce `docs/ci/smoke_test_results.json` y retorna `0` solo si todas las sondas tienen éxito.

---

## 4. Presupuestos de Rendimiento con Lighthouse CI (Performance Budgets)
- **Configuración:** [`.lighthouserc.json`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/.lighthouserc.json) / [`scripts/ci/run_lighthouse_ci.sh`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/ci/run_lighthouse_ci.sh)
- **Tarea ClickUp:** `86e302a86`
- **Presupuestos Enforced:**
  - Largest Contentful Paint (LCP): $\le 2.5\text{s}$ ($2500\text{ms}$).
  - Cumulative Layout Shift (CLS): $\le 0.1$.
  - First Input Delay (FID) / INP: $\le 200\text{ms}$.
  - First Contentful Paint (FCP): $\le 1.8\text{s}$ ($1800\text{ms}$).
  - Total Blocking Time (TBT): $\le 300\text{ms}$.
  - Puntuación de Accesibilidad WCAG: $\ge 0.90$.

---

## 5. Regresión Visual en los 5 Componentes Base (Visual Regression)
- **Suite Vitest:** [`frontend/tests/integration/ui/visual-regression.test.tsx`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/frontend/tests/integration/ui/visual-regression.test.tsx)
- **Suite Playwright:** [`frontend/tests/e2e/components-visual.spec.ts`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/frontend/tests/e2e/components-visual.spec.ts)
- **Tarea ClickUp:** `86e302a2b`
- **Componentes Evaluados:**
  1. `Button`: Variantes (`default`, `secondary`, `ghost`, `destructive`, `outline`, `disabled`).
  2. `Card`: Estructura (`Card`, `CardHeader`, `CardContent`, `CardFooter`).
  3. `Badge`: Estados (`default`, `success`, `warning`, `outline`).
  4. `Skeleton`: Estados de carga y accesibilidad con `aria-busy`.
  5. `Progress`: Modos determinado e indeterminado.
- **Entorno:** Renderizado determinista en modo claro (`light`) y modo oscuro (`dark`).

---

## 6. Gate de Cobertura Mínima por Spec (Coverage Gate)
- **Script:** [`scripts/ci/coverage_gate.py`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/scripts/ci/coverage_gate.py)
- **Tarea ClickUp:** `86e302a2n`
- **Umbrales:**
  - Cobertura global de backend $\ge 80.0\%$.
  - Cobertura específica del dominio (`src/domain/`) $\ge 90.0\%$.
  - Cobertura global de frontend $\ge 80.0\%$.
- **Bloqueo:** Falla con código `1` y bloquea el merge en GitHub Actions si la cobertura disminuye por debajo del umbral establecido.

---

## 7. Suite E2E Completa de Flujos Críticos (Playwright Critical Flows)
- **Tarea ClickUp:** `86e302a1c`
- **Archivos de Prueba:**
  1. `critical-flow-wardrobe-outfit-vton.spec.ts`: Subida de prenda $\to$ recomendación de outfit $\to$ probador virtual CatVTON.
  2. `auth-flow.spec.ts`: Login y Signup con validación y estados de formulario.
  3. `onboarding-flow.spec.ts`: Exploración de catálogo cápsula y preferencias de estilo.
  4. `vton-history-flow.spec.ts`: Navegación y consulta del historial de pruebas virtuales (`/try-on/history`).
