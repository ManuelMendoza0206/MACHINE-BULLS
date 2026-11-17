# Service Level Objectives (SLOs) & SRE Framework — StyleMe

**Código de Tarea:** `86e302a5u`  
**Área:** SRE / DevOps / Infraestructura  
**Versión:** 1.0 (Producción / MVP)  
**Última actualización:** Noviembre 2026

---

## 1. Resumen Ejecutivo y Presupuesto de Error

StyleMe establece Service Level Objectives (SLOs) cuantitativos y medibles con el objetivo de garantizar una experiencia de usuario fluida, predecible y resiliente tanto en las recomendaciones de vestuario en tiempo real como en la generación asíncrona de pruebas virtuales (VTON).

### Tabla Maestra de SLOs

| Servicio / Endpoint | Indicador de Nivel de Servicio (SLI) | Objetivo (SLO) | Presupuesto de Error (Error Budget) | Severidad de Alerta |
| :--- | :--- | :--- | :--- | :--- |
| **API Global Uptime** | Respuestas HTTP exitosas (no 5xx) | **$\ge 99.5\%$ mensual** | 0.5% (~3.6 horas / mes de indisponibilidad) | P1 (Crítica) |
| **Try-On VTON (`/api/v1/vton/try-on`)** | Latencia extremo a extremo de generación (p95) | **$< 15.0$ segundos** | 5% de ejecuciones $\ge 15\text{s}$ | P2 (Alta) |
| **Try-On VTON (p99)** | Latencia extremo a extremo de generación (p99) | **$< 25.0$ segundos** | 1% de ejecuciones $\ge 25\text{s}$ | P2 (Alta) |
| **Recomendador (`/api/v1/recommend`)** | Tiempo de respuesta HTTP (p95) | **$< 500$ ms** | 5% de requests $\ge 500\text{ms}$ | P3 (Media) |
| **Recomendador (p99)** | Tiempo de respuesta HTTP (p99) | **$< 1000$ ms** | 1% de requests $\ge 1\text{s}$ | P2 (Alta) |
| **Subida de Prenda (`/api/v1/garments/upload`)** | Inferencia CLIP + RemBG (p95) | **$< 2.5$ segundos** | 5% de subidas $\ge 2.5\text{s}$ | P3 (Media) |
| **Catálogo Cápsula (`/api/v1/capsule`)** | Lectura de catálogo (p95) | **$< 200$ ms** | 5% de consultas $\ge 200\text{ms}$ | P4 (Baja) |

---

## 2. Definición Detallada por Endpoint

### 2.1 Pipeline de Probador Virtual (VTON)
- **Endpoint:** `POST /api/v1/vton/try-on` y polling en `GET /api/v1/vton/status/{job_id}`.
- **Riesgo:** Alto consumo de cómputo GPU y latencia variable de modelos de difusión (CatVTON / IDM-VTON).
- **SLO:**
  - **Tiempo de aceptación inicial:** $< 500\text{ms}$ para crear el job en estado `processing` y retornar el ID.
  - **Latencia de procesamiento (p95):** Menor a 15 segundos desde la creación hasta `completed`.
  - **Tasa de éxito de inferencia:** $\ge 98\%$ de jobs completados sin error irrecuperable.
- **Acción ante degradación:** Activación automática del Circuit Breaker tras 3 fallos consecutivos y reintentos con backoff exponencial.

### 2.2 Motor de Recomendación Cromática y Estética
- **Endpoint:** `POST /api/v1/recommend` y `GET /api/v1/outfits/{id}`.
- **Riesgo:** Bloqueo en cálculo de combinaciones y similitud coseno en armarios con más de 50 prendas.
- **SLO:**
  - **Latencia p95:** $< 500\text{ms}$.
  - **Disponibilidad:** $\ge 99.9\%$.
- **Optimización:** Reducción de dimensionalidad de embeddings a 128-D mediante `AestheticProjectionHead` (reducción de 75% en cómputo vectorial).

### 2.3 Análisis de Prendas y Detección de Atributos
- **Endpoint:** `POST /api/v1/garments/upload`.
- **Riesgo:** Inferencia de remoción de fondo (rembg) y extracción de features con Fashion-CLIP en CPU.
- **SLO:**
  - **Latencia p95:** $< 2.5\text{s}$.
  - **Fallback:** Si la confianza de CLIP es menor al 40% (`confidence < 0.40`), activación del clasificador de respaldo ResNet-50 sin superar los 3.0s de latencia total.

---

## 3. Arquitectura de Monitoreo y Métricas (`86e302a5f`)

### 3.1 Recolección con Middleware Prometheus
El backend implementa un middleware ASGI (`src/middleware/metrics.py`) que intercepta cada request entrante:
1. Registra la duración exacta en segundos (`http_request_duration_seconds`).
2. Clasifica por método (`method`), ruta normalizada (`path`) y código de estado (`status_code`).
3. Mantiene ventanas móviles para calcular percentiles reales (p50, p90, p95, p99).
4. Expone las métricas para consumo de Prometheus o agentes de monitoreo en:
   ```
   GET /metrics
   ```

### 3.2 Paneles y Visualización de Dashboards
El dashboard de observabilidad se divide en 3 cuadrantes:
1. **Cuadrante VTON (Crítico):**
   - Gráfico de latencia percentil (p50 vs p95 vs p99).
   - Estado del Circuit Breaker (CLOSED / OPEN / HALF_OPEN).
   - Tasa de reintentos por backoff y porcentaje de jobs completados vs fallidos.
2. **Cuadrante Tráfico y Latencia HTTP:**
   - RPS (Requests per second) agrupado por status code (2xx, 4xx, 5xx).
   - Latencia p95 de `/api/v1/recommend` y `/api/v1/garments/upload`.
3. **Cuadrante Machine Learning & Fallback:**
   - Porcentaje de inferencias que activaron el fallback a ResNet-50.
   - Distribución de confianza estética de Fashion-CLIP.

---

## 4. Política de Alertas y Escalamiento (`86e302a61`)

En cumplimiento con la regla de bloqueo crítico de `docs/clickup/team_charter.md`:

### 4.1 Niveles de Alerta

| Nivel | Condición Disparadora | Canal de Notificación | Tiempo de Respuesta (MTTA) |
| :--- | :--- | :--- | :--- |
| **P1 - Bloqueo Crítico** | API Error Rate $> 2\%$ en 5 min, o Circuit Breaker VTON OPEN $> 5$ min | Sentry + Canal Discord/Slack del equipo + Alerta urgente | **$< 15$ minutos** |
| **P2 - Degradación Alta** | Latencia p95 VTON $> 15\text{s}$ durante 3 ventanas consecutivas | Sentry (Issue con tag `slo:vton_latency`) | **$< 1$ hora** |
| **P3 - Alerta de Rendimiento** | Latencia p95 Recomendador $> 500\text{ms}$ en 10 min | Sentry (Issue con tag `slo:recommend_latency`) | **$< 4$ horas** |
| **P4 - Preventiva** | Invocación de fallback ResNet-50 $> 15\%$ del tráfico de subida | Log de auditoría semanal | Sprint Review |

### 4.2 Integración Sentry
- Si `SENTRY_DSN` está presente en el entorno, las alertas de breach de SLO emiten automáticamente un evento con nivel `ERROR` o `FATAL`, incluyendo tags `endpoint`, `latency_seconds`, `threshold_seconds` y el stacktrace correspondiente.
- Si Sentry no está configurado, el sistema emite un log estructurado JSON estandarizado:
  ```json
  {
    "event": "SLO_BREACH_ALERT",
    "severity": "CRITICAL",
    "endpoint": "/api/v1/vton/try-on",
    "metric": "latency_p95",
    "observed_value": 16.42,
    "target_threshold": 15.0,
    "timestamp": "2026-11-06T19:30:00Z"
  }
  ```
