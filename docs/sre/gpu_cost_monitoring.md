# Monitoreo Continuo de Costo y Latencia de Inferencia GPU — StyleMe

**Código de Tarea:** `86e301dz5`  
**Área:** SRE / MLOps / FinOps  
**Frecuencia:** Revisión en cada Sprint Review desde B4  
**Versión:** 1.0 (Noviembre 2026)

---

## 1. Objetivo y Modelo de Costos

StyleMe utiliza modelos generativos de difusión para el Probador Virtual (VTON) como CatVTON e IDM-VTON, cuyo cómputo requiere aceleración por GPU. Este documento formaliza la política de seguimiento presupuestario, la matriz de costos unitarios y los umbrales de alerta para prevenir sobrecostos en proveedores cloud.

### 1.1 Matriz de Precios por Proveedor (Noviembre 2026)

| Proveedor / Hardware | Costo por Segundo (USD) | Latencia Media por Capa | Costo por Capa (USD) | Costo Outfit Típico (2 Capas) |
| :--- | :--- | :--- | :--- | :--- |
| **Replicate (Nvidia A40 48GB)** | $0.00230 | 8.5 s | ~$0.0195 | **$0.0391** |
| **Replicate (Nvidia A100 40GB)** | $0.00320 | 6.2 s | ~$0.0198 | **$0.0396** |
| **RunPod Serverless (RTX 4090 24GB)**| $0.00044 | 6.8 s | ~$0.0030 | **$0.0060** |
| **Google Colab Pro (Desarrollo)** | Flat $10/mes | 9.5 s | $0.0000 | Flat mensual |

---

## 2. Proyecciones Mensuales de Presupuesto

Basado en la herramienta automatizada [`backend/src/ml/validation/audit_gpu_costs.py`](file:///home/jesus-rodrigo/ucb/ciencia-datos/taller-sistemas-inteligentes/MACHINE-BULLS/backend/src/ml/validation/audit_gpu_costs.py) (con un promedio real de 1.8 capas por outfit):

| Volumen de Peticiones VTON | Replicate A40 (MVP Actual) | RunPod Serverless (Escala) | Estado Presupuestario |
| :--- | :--- | :--- | :--- |
| **500 try-ons / mes** | **$17.59 USD** | $2.70 USD | ✅ Dentro del límite MVP ($50 USD) |
| **1.000 try-ons / mes** | **$35.19 USD** | $5.39 USD | ✅ Dentro del límite MVP ($50 USD) |
| **5.000 try-ons / mes** | $175.95 USD | **$26.93 USD** | ⚠️ Requiere migración a RunPod |
| **10.000 try-ons / mes** | $351.90 USD | **$53.86 USD** | ⚠️ Requiere migración a RunPod |

---

## 3. Umbrales de Alerta y Kill Switch (Techo de Gasto)

1. **Alerta Preventiva (80% del presupuesto mensual):**
   - Si el gasto acumulado en el mes supera los **$40.00 USD**, se dispara notificación en el canal `#devops-alerts` con severidad P3.
2. **Alerta Crítica de Ritmo de Gasto (Burn Rate):**
   - Si el gasto diario supera los **$5.00 USD/día** durante 2 días consecutivos, se activa una revisión prioritaria de tráfico (posible abuso o bucle de polling).
3. **Kill Switch / Disyuntor Financiero:**
   - Si el gasto alcanza los **$48.00 USD** (96% del tope de $50 USD), el backend conmuta automáticamente la variable `VTON_PROVIDER=mock` para nuevas solicitudes, informando al usuario: `"El servicio de probador virtual ha alcanzado la cuota de demostración temporal. Puedes seguir explorando outfits y prendas."`
   - El endpoint de health reporta `"vton_status": "quota_exceeded"` sin afectar el catálogo ni el recomendador.

---

## 4. Gobernanza en Sprint Reviews

En cada Sprint Review (comenzando desde el hito B4), el equipo auditará los siguientes tres indicadores mediante la ejecución del CLI:

```bash
uv run python -m src.ml.validation.audit_gpu_costs --output docs/sre/gpu_cost_audit.json
```

1. **Gasto Total del Sprint:** Comparado contra la cuota autorizada.
2. **Latencia p95 real observada:** Verificada contra el SLO de 15 segundos.
3. **Tasa de Aprobación de Calidad SSIM:** Verificada mediante `audit_vton_quality.py` para asegurar que las optimizaciones de velocidad no degraden la fidelidad visual (umbral: $\text{SSIM} \ge 0.70$).
