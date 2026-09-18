# Registro de riesgos

Fecha: 2026-08-26
Criterio: probabilidad por impacto. Cada riesgo tiene dueño y mitigación desde el diseño.

| ID | Riesgo | Probabilidad | Impacto | Mitigación | Dueño | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| R01 | Latencia de inferencia por recomendación | Alta | Medio | Embeddings del catálogo precomputados en pgvector. En ejecución solo se resuelve similitud contra la selección actual. | Backend e inferencia | Mitigado |
| R02 | Fotos con desenfoque o baja luz | Alta | Alto | Filtro con varianza de Laplaciano en OpenCV antes de enviar a la API. La interfaz rechaza la toma por debajo del umbral y pide otra. | Frontend e ingesta | Mitigado |
| R03 | Costo y disponibilidad de GPU | Alta | Crítico | Embeddings cuantizados en CPU con ONNX y ejecución serverless en Colab o Kaggle para pruebas no productivas. | Arquitectura y MLOps | Mitigado |
| R04 | Baja precisión en estética y compatibilidad | Media | Alto | Recomendación híbrida. El modelo propone y reglas de teoría del color filtran combinaciones no válidas. Umbral 0.60 con fallback a metadatos. | Modelos y ML | Mitigado |
| R05 | Licenciamiento restrictivo de modelos VTON | Alta | Crítico | Código VTON aislado con licencia de investigación no comercial. Si la licencia lo invalida, el módulo se desconecta. | Coordinación y gobernanza | Vigilado |
| R06 | Disponibilidad del despliegue y de datos en la defensa | Media | Alto | Respaldo local offline con git bundle, node_modules y dataset de muestra. Ejecución reproducible con npm run verify. | Equipo | Vigilado |

Notas:

* R05 queda vigilado porque los pesos de VTON imponen cláusula no comercial y costo por imagen. El plan de contingencia es operar como asistente de guardarropa con visualización en tablero.
* R06 queda vigilado hasta el cierre del taller. El frontend se puede demostrar con mocks y la suite de 188 pruebas unitarias más 4 e2e.

