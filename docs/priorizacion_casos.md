# Priorización y Selección de Casos de Uso

> **Estado:** Plantilla. A completar por el equipo cuando se defina el tema del proyecto.

## Matriz de Evaluación de Casos

Para la selección del proyecto del semestre en Taller de Sistemas Inteligentes, se evaluarán las alternativas utilizando una escala cuantitativa de 1 a 5 (donde 1 representa la peor condición / mayor riesgo y 5 la mejor condición / menor riesgo).

| Caso | Valor | Datos | Factibilidad | Riesgo | Despliegue | Puntaje Total | Decisión |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| A. StyleSync IA: Probador Virtual + Asesor de Estilo | 4 | 4 | 4 | 3 | 5 | **20** | Elegir |
| B. Arte-Match: Buscador Semántico de Museos | 3 | 5 | 3 | 4 | 4 | **19** | Descartar |
| C. Tutor Inteligente de Ejecución Musical (Guitarra, Piano y otros) | 5 | 3 | 2 | 2 | 4 | **16** | Descartar |

---

## Interpretación de la Escala de Evaluación

| Criterio | Pregunta guía | Interpretación del 5 (Mejor condición) |
| --- | --- | --- |
| **Valor** | ¿A quién ayuda y por qué importa? | 5 = Usuario e impacto bien definidos |
| **Datos** | ¿Hay datos accesibles y utilizables? | 5 = Datos disponibles, autorizados y suficientes |
| **Factibilidad** | ¿Cabe en 18 semanas? | 5 = Alcance acotado e implementable |
| **Riesgo** | ¿Qué puede impedir el proyecto? | 5 = Riesgo bajo o totalmente controlable |
| **Despliegue** | ¿Puede operarse fuera del entorno local? | 5 = Ruta técnica y arquitectura clara |

---

## Justificación Detallada por Caso

### Caso A: StyleSync IA (Probador Virtual + Asesor de Estilo)
- **Valor (4):** Usuario claro: compradores de indumentaria online con dudas de talla, estilo o combinación; impacto medible en reducción de devoluciones y conversión de venta. Pierde un punto por depender del catálogo de un comercio específico.
- **Datos (4):** Datasets públicos de try-on (VITON-HD, DressCode) con pares persona-prenda + catálogo propio; exige un pipeline de datos real (curaduría, augmentación, versionado) pero es accesible y manejable.
- **Factibilidad (4):** Dos pilares (VTON generativo + asesor de estilo) dan la dificultad justificada que el docente exige — no es un proyecto trivial de una semana — pero se acota en 18 semanas mediante catálogo reducido y alcance por fases.
- **Riesgo (3):** IA generativa exigente en GPU; la calidad realista (distorsiones de cuerpo o tela) y el costo de inferencia son controlables con acotación de alcance y monitoreo.
- **Despliegue (5):** Ruta completa de MLOps: pipelines de entrenamiento/retraining, inferencia con GPU en cloud, versionado de modelos y monitoreo de calidad. Es el caso que mejor llena el requerimiento de despliegue real y ciclo de vida completo.

### Caso B: Arte-Match (Buscador Semántico de Museos)
- **Valor (3):** Usuario final difuso ("público general") e impacto basado en entretenimiento y viralidad, difícil de medir con un resultado concreto.
- **Datos (5):** APIs abiertas del Metropolitan Museum of Art (The Met) y Rijksmuseum con miles de obras de dominio público etiquetadas y listas para descargar, sin trámites de acceso ni licencias complejas.
- **Factibilidad (3):** Stack acotado y estándar: embeddings (CLIP) + búsqueda vectorial (FAISS/chromaDB) + app web. El alcance se cierra en días/semanas — el proyecto no llena las 18 semanas ni demuestra el ciclo MLOps que el docente exige.
- **Riesgo (4):** Sin datos sensibles ni personales. Riesgo técnico controlable: calidad de los embeddings, performance de la búsqueda y acierto de la "vibra" estética.
- **Despliegue (4):** Camino claro: API + base vectorial + frontend web en la nube, aunque el pipeline es casi estático (sin retraining ni monitoreo de modelos que sostener).

### Caso C: Tutor Inteligente de Ejecución Musical (Guitarra, Piano y otros instrumentos)
- **Valor (5):** Usuario amplísimo: la guitarra es uno de los instrumentos más estudiados del mundo, sumado a piano y otros; correcciones medibles de ritmo, dinámica y articulación para estudiantes que practican en soledad.
- **Datos (3):** Datasets públicos por instrumento (MAESTRO para piano, GuitarSet para guitarra con audio+MIDI), con licencias no comerciales y desfase de dominio: el audio de micrófono de teléfono en una habitación real no se parece al del dataset, exigiendo recolección propia o aumentación por instrumento.
- **Factibilidad (2):** Multi-instrumento multiplica la complejidad — cada timbre y técnica (rasgueo, hammer-on, polifonía) exige su propio pipeline (DSP + CRNN + DTW). En 18 semanas solo cierra acotando a 1-2 instrumentos y un repertorio limitado.
- **Riesgo (2):** La transcripción polifónica con micrófono real es un problema abierto; multi-instrumento amplifica armónicos, técnicas y la incertidumbre de latencia online en móvil.
- **Despliegue (4):** Camino claro mediante app móvil con modelos optimizados (TFLite/ONNX), con MLOps de edge; el cómputo acotado del dispositivo es una restricción operativa real. 

---

## Decisión Final y Justificación

Se selecciona oficialmente el **Caso A (StyleSync IA: Probador Virtual + Asesor de Estilo)**.

**Justificación:** Es el caso que mejor cumple el requerimiento del docente: complejidad técnica genuina (IA generativa VTON + embeddings + recomendación) que justifica las 18 semanas, pipeline MLOps completo (entrenamiento, retraining, monitoreo de calidad, versionado de modelos), despliegue real con GPU en la nube y un usuario con impacto medible (reducción de devoluciones, conversión de venta). Supera a Arte-Match (19), casi trivial de implementar, y al Tutor de Ejecución Musical (16), cuyo valor crece pero multiplica el riesgo de factibilidad por instrumento.

---

## Product Goal Formulado

> **"Para compradores y comercios de indumentaria online, construiremos un sistema inteligente de probador virtual y asesor de estilo que permite visualizar prendas sobre el cuerpo del usuario y generar combinaciones coherentes según estilos, reduciendo devoluciones y aumentando la conversión de venta, utilizando un pipeline MLOps desplegado en la nube."**