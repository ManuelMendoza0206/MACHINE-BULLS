# StyleMe — línea base y criterios para el plan de segunda defensa

**Revisión:** rama `main`, commit `2fddcfa4`  
**Tipo:** inventario estático; no se ejecutaron suites ni inferencias GPU.  
**Objetivo:** fijar el estado observable antes de seguridad, cambios de datos y experimentos CatVTON.

## Estado confirmado en el repositorio

| Área | Estado en `main` | Consecuencia para el plan |
|---|---|---|
| Categorías | CLIP declara `top`, `bottom`, `dress`, `outwear`, `shoes`, `bag`; el catálogo muestra Todas, Superiores, Inferiores y Abrigos. | Mantener las seis clases; completar tres filtros visibles. |
| Clasificación | Runtime combina prompts zero-shot CLIP y fallback ResNet configurable por umbral. | “Aumentar clasificación” significa mejorar evaluación/precisión o atributos; no añadir clases sin cambiar la decisión de taxonomía. |
| VTON | Provider swappable; pipeline secuencial multicapa con máscaras `inner`/`outer`/`lower`/`overall`/`upper`. Footwear y bag se omiten. | La fase CatVTON optimiza el pipeline existente y debe comparar con su baseline. |
| Configuración VTON | `infra/.env` define `mock`; Compose también usa `mock` como default. `auto` puede terminar en mock si no detecta server/token. | Definir perfiles y guardas por modo; no inferir que `health` confirma CatVTON real sin comprobar el provider. |
| Base de datos | Compose tiene Postgres en perfil `local-db`; backend usa SQLite por defecto y `create_all()` más ALTERs puntuales. Existen SQL `0001`–`0006`, sin runner conectado al arranque. | Separar creación/adopción de esquema, SQL Supabase y modo local antes de migrar volúmenes. |
| Seguridad | JWT tiene fallback sin validar firma; demo se usa sin Bearer. Rutas de outfits y VTON no derivan consistentemente recursos del usuario autenticado. | Prioridad transversal antes de aceptar usuarios reales o fotos persistentes. |
| Uploads | Garments, VTON y shopping leen bytes completos; no hay límite explícito de bytes/dimensiones en los handlers revisados. | Acordar límites antes de procesar o decodificar imágenes. |
| Rate limit y métricas | Estado en memoria por proceso; rate limit confía en `X-Forwarded-For`. | Redis requiere además definir proxies confiables; métricas locales no representan varios workers. |
| E2E | CI ejecuta Playwright; hay ocho `test.skip` explícitos en flujos VTON/recomendación. | Primero identificar si cada skip sigue vigente; criterios de aceptación deben listar los skips restantes. |
| Datos VTON | Auditoría versionada declara `samples: 2`, `ssim_mean: 0.6765`; política/ADR dicen retención corporal máxima de 24 h. | No usar n=2 como evidencia general; cualquier foto canónica persistente requiere revisar la política primero. |

## Modos de ejecución acordados para el plan

Estos son criterios de configuración para los pasos posteriores; este documento no cambia Compose ni secretos.

| Modo | Provider esperado | Base de datos | Uso |
|---|---|---|---|
| Desarrollo local rápido | `mock` explícito | SQLite o Postgres local explícito | Iteración sin GPU; nunca evidencia de calidad del modelo. |
| Stack reproducible local | CatVTON explícito y server alcanzable | Postgres local | Smoke end-to-end de demo; falla si el provider real no está activo. |
| Pruebas deterministas de stack | `mock` explícito por override de test | Postgres de test/local aislado | E2E de integración sin GPU ni inferencia externa. |
| Supabase | Provider definido por entorno | `DATABASE_URL` de Supabase | Integración con roles, políticas y claims reales; no asumir equivalencia con DB local. |

La fuente de verdad de cada variable y su precedencia se debe implementar y probar al trabajar la fase de infraestructura. No colocar secretos en `infra/.env` versionado.

## Decisión de clasificación

- Taxonomía cerrada: seis categorías CLIP existentes. `outwear` es el rótulo de categoría; `outerwear` es la posición de dominio y deben normalizarse en presentación/API donde corresponda sin colapsar ambos conceptos.
- “Más clasificación” queda acotado a dos líneas medibles: mejorar calidad de categoría/estética y evaluar atributos adicionales (por ejemplo material y patrón) como capacidades separadas, no como nuevas clases de categoría.
- Antes de promover atributos, definir dataset etiquetado, métricas por atributo, baseline, cobertura por clase y umbral de abstención/manual review. No afirmar que hay modelo entrenado/promovido si el artefacto de runtime no está versionado y servido.

## Baseline CatVTON: qué se conoce y qué falta medir

**Conocido en código/documentación:** ejecución secuencial por capa; estimación configurada en el provider para 18 s/capa (no es una medición); el plan y comentarios del stack mencionan aproximadamente 50 s/capa, sin reporte reproducible asociado. La auditoría de calidad disponible tiene dos muestras y SSIM medio 0.6765. Estos datos no forman una línea base comparable entre cambios.

**Pendiente de ejecutar con el servidor/modelo CatVTON real:** registrar commit/hash del server y pesos, GPU/VRAM, resolución/aspect ratio, steps, guidance, seed, cantidad/orden de capas, tiempo de aceptación y tiempo total por job, latencia por capa, pico de memoria, errores/fallbacks y resultados visuales.

### Protocolo mínimo de comparación

1. Congelar una lista de pares persona/prenda y sus categorías; reservar un conjunto fijo y registrar procedencia/consentimiento.
2. Guardar configuración completa y hashes de inputs, server y modelo para cada corrida.
3. Comparar primero el pipeline actual sin cambios con cada candidato, usando misma GPU, entradas y resolución; repetir cada condición para observar variación.
4. Reportar por categoría: tasa de éxito, latencia p50/p95 y por capa, VRAM pico, SSIM/PSNR solo con referencias geométricamente válidas, LPIPS/CLIP como señales complementarias y evaluación visual de preservación de identidad/prenda.
5. No promover una modificación por una sola métrica; declarar umbrales de no-regresión de calidad, latencia y memoria antes de ejecutar el sweep.

No se fija ahora un valor de steps/CFG ganador: los valores del plan son candidatos de experimento, no una configuración validada.

## Matriz de calidad y aceptación

| Nivel | Entorno | Debe verificar | GPU/red externa |
|---|---|---|---|
| Backend unit/integration | SQLite temporal y servicios simulados; Postgres dedicado cuando se prueben SQL/RLS | contratos, ownership, errores y migraciones | No, salvo suites explícitamente ML |
| Frontend unit/integration | Vitest/MSW | estados de UI, schemas y requests | No |
| E2E determinista | Compose/stack aislado con mock explícito | flujos UI/API reales, auth de prueba y seed/cleanup repetible | No |
| Smoke CatVTON | Stack local + server CatVTON real | provider esperado, job multicapa, resultado accesible y latencia | Sí |
| Supabase/RLS | proyecto/DB de prueba con roles y JWT reales | aislamiento entre usuarios y políticas efectivas | Red/credenciales de prueba |
| Evaluación ML/VTON | Dataset fijo + hardware y modelos identificados | métricas desglosadas, variabilidad, memoria y tiempos | Sí para VTON real |

### Reglas globales de aceptación

- Un resultado de prueba informa comando, entorno, commit, conteos passed/failed/skipped y razón de cada skip.
- Los tests con `mock` prueban integración y flujo; no cuentan como evidencia de calidad o rendimiento CatVTON.
- Ningún benchmark se publica como “real” si no incluye configuración, hardware, tamaño de muestra y artefactos identificables.
- No se aceptan cambios de VTON que excedan los umbrales preacordados de latencia/memoria o degraden fidelidad de prendas/identidad sin decisión explícita.
- No se habilitan fotos persistentes mientras la política de retención y el borrado local/Azure no estén definidos e implementados.
- Los skips se aceptan solo si están nombrados, justificados y asociados a una dependencia externa/GPU concreta; CI debe fallar si aparecen skips nuevos sin revisión.

## Bloqueos para cerrar el baseline experimental

- El servidor `E:\MACHINEBULLS\CatVTON` y sus pesos están fuera de este repositorio; no se inspeccionaron ni ejecutaron en esta revisión.
- No hay manifiesto de evaluación CatVTON con veinte pares disponible en el repo.
- La política versionada exige expiración de fotos corporales a 24 horas, incompatible con conservar una foto canónica sin decisión y controles nuevos.

