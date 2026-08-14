# Priorización y Selección de Casos de Uso

## Matriz de Evaluación de Casos

Para la selección del proyecto del semestre en Taller de Sistemas Inteligentes, se evaluaron tres alternativas utilizando una escala cuantitativa de 1 a 5 (donde 1 representa la peor condición / mayor riesgo y 5 la mejor condición / menor riesgo).

| Caso de Uso | Valor (1-5) | Datos (1-5) | Factibilidad (1-5) | Riesgo (1-5) | Despliegue (1-5) | Puntaje Total | Decisión |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Caso A:** Sistema de Priorización Inteligente y Triage de Tickets de Soporte | 5 | 4 | 4 | 4 | 5 | **22** | **Elegido** |
| **Caso B:** Detección de Emociones y Comportamiento en Tiempo Real por Video | 3 | 2 | 2 | 2 | 3 | **12** | **Descartado** |
| **Caso C:** Recomendador Inteligente de Becas y Oportunidades Académicas | 4 | 3 | 4 | 3 | 4 | **18** | **Reserva** |

---

## Criterios de Evaluación

- **Valor:** ¿Resuelve un problema real para un usuario/interesado específico con un resultado medible?
- **Datos:** ¿Existen fuentes de datos accesibles, autorizadas, suficientes y con licenciamiento claro?
- **Factibilidad:** ¿El alcance técnico y operativo se puede completar rigurosamente dentro de las 18 semanas del semestre?
- **Riesgo:** ¿Qué tan controlables son las amenazas técnicas, éticas, de privacidad y de dependencia?
- **Despliegue:** ¿Existe un camino claro para poner el sistema en producción operando fuera del entorno local?

---

## Justificación Detallada por Caso

### Caso A: Priorización Inteligente y Triage de Tickets de Soporte
- **Valor (5):** Identifica con precisión a los responsables del área de TI/Soporte, reduciendo significativamente los tiempos de atención y asignación manual.
- **Datos (4):** Se cuenta con datasets públicos estructurados y anonimizados de mesas de ayuda (ITIL/Kaggle), además de posibilidad de generación sintética validada.
- **Factibilidad (4):** El alcance del modelo (clasificación de texto/NLP + motor de reglas) es acotado y viable de implementar de extremo a extremo en 18 semanas.
- **Riesgo (4):** Riesgo ético y de privacidad bajo al trabajar con texto anonimizado sin datos sensibles de salud o biometría.
- **Despliegue (5):** Arquitectura estándar basada en API REST (FastAPI/Go), contenedores Docker y servicios cloud fácilmente desplegables.

### Caso B: Detección de Emociones en Video en Tiempo Real
- **Valor (3):** Útil para análisis publicitario, pero sin un usuario final claramente definido en el contexto académico inmediato.
- **Datos (2):** Los datasets biométricos requieren licencias complejas y presentan sesgos severos de entrenamiento.
- **Factibilidad (2):** La latencia del procesamiento de video en tiempo real requiere infraestructura de hardware (GPU) con la que no se cuenta formalmente.
- **Riesgo (2):** Elevado riesgo legal, ético y de privacidad respecto al consentimiento de uso de imagen.
- **Despliegue (3):** Despliegue complejo debido a requerimientos de ancho de banda y capacidad de cómputo en la nube.

### Caso C: Recomendador de Becas y Oportunidades Académicas
- **Valor (4):** Alto impacto para la comunidad estudiantil.
- **Datos (3):** La información se encuentra dispersa en sitios web no estructurados, requiriendo un esfuerzo considerable en web scraping y mantenimiento.
- **Factibilidad (4):** Algoritmos de recomendación bien documentados y alcanzables.
- **Riesgo (3):** Riesgo moderado de desactualización constante de la oferta de becas.
- **Despliegue (4):** Despliegue web estándar.

---

## Restricción Principal Identificada

La **restricción principal** para el semestre es el **Acceso y Gobernanza de Datos en Entornos de Producción**, sumada a la ventana fija de **18 semanas de ejecución**. Por tanto, se prioriza un caso con disponibilidad inmediata de datos no confidenciales sobre proyectos que requieran trámites de acceso o procesamiento intensivo de hardware.

---

## Decisión Final y Justificación

Se selecciona oficialmente el **Caso A (Sistema de Priorización Inteligente de Tickets de Soporte)**.

**Justificación:** Presenta el balance óptimo entre valor de negocio medible, disponibilidad de datos estructurados desde el Sprint 0, bajo riesgo normativo/ético y una ruta de despliegue clara mediante arquitectura de microservicios o contenedores.

---

## Product Goal Formulado

> **"Para los equipos de soporte técnico e infraestructura de TI, construiremos un sistema inteligente de clasificación y triage automatizado de tickets que categorice, priorice y recomiende acciones de solución con evidencia explicable, reduciendo el tiempo medio de asignación (MTTA) en un 35% y manteniendo la trazabilidad auditable de cada decisión."**