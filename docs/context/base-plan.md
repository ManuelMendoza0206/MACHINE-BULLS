# DOCUMENTO DE PLANTEAMIENTO E INGENIERÍA DEL PROYECTO

## 1. TÍTULO DEL PROYECTO Y RESUMEN EJECUTIVO

### 1.1 Título del Proyecto
**StyleMe**: Sistema Inteligente de Clasificación, Recomendación de Moda Masculina y Prueba Virtual Basado en Aprendizaje Profundo e IA Generativa.

### 1.2 Resumen Ejecutivo
El sector de la moda masculina ha experimentado una transformación cultural caracterizada por la adopción de estéticas urbanas y conceptuales bien definidas (*Old Money, Streetwear, Soft Boy, Starboy, Gorpcore*, entre otras). No obstante, existe una brecha sustancial entre el deseo de los usuarios jóvenes de proyectar una estética determinada y su capacidad práctica para clasificar su guardarropa, evaluar la compatibilidad cromática/estilística de sus prendas y visualizar el resultado en su propia anatomía antes de vestir o comprar.

**StyleMe** aborda este problema mediante una plataforma web integral impulsada por Aprendizaje Automático (ML) y Visión por Computadora (CV). El sistema combina:
*   **Módulo de visión computacional:** Para la extracción de características, categorización de prendas y etiquetado de estéticas contemporáneas.
*   **Motor de recomendación:** Basado en aprendizaje de compatibilidad (*outfit compatibility learning*) que opera sobre el espacio vectorial de las prendas.
*   **Pipeline de prueba virtual (Virtual Try-On - VTON):** Combina estimación de pose, segmentación anatómica y modelos de difusión para proyectar las combinaciones sugeridas sobre la imagen real del usuario.

---

## 2. JUSTIFICACIÓN TÉCNICA Y ACADÉMICA

### 2.1 Evitando el "API Wrapper": Aporte de ML Propio vs. Servicios Externos
Un error recurrente en proyectos académicos con IA generativa es actuar como un mero envoltorio (*wrapper*) de APIs comerciales, sin procesamiento de datos, entrenamiento o ajuste fino (*fine-tuning*) propio. StyleMe resuelve esta falencia mediante una arquitectura modular donde el componente generativo es solo el paso final de visualización, mientras que la inteligencia analítica reside en modelos propios desarrollados y entrenados por el equipo.

+-----------------------------------------------------------------------------------+
|                                  PIPELINE STYLEME                                 |
+-----------------------------------------------------------------------------------+
|  [ INSUMO ]       --> [ CV & ML PROPIO ]         --> [ MOTOR PROPIO ]  --> [ API VTON ]  |
|  Foto Usuario /        Clasificación de prenda        Aprendizaje de       Generación    |
|  Foto Prenda           y detección de estética        compatibilidad y     de imagen     |
|                        (Fine-tuning CLIP/ResNet)      matriz cromática     (Visualización|
|                                                       (Metric Learning)     final)       |
+-----------------------------------------------------------------------------------+


### 2.2 Valor Agregado Real
*   **Para el usuario:** Elimina la "fatiga de decisión" diaria y el riesgo financiero al comprar prendas incompatibles con su armario actual.
*   **Para el ámbito académico:** Aporta una solución al problema de clasificación de estéticas no estructuradas utilizando *Zero-Shot Learning* y *Fine-Tuning* multimodal, superando las limitaciones de los datasets tradicionales de moda que solo etiquetan categorías funcionales ("camisa", "pantalón").

---

## 3. DEFINICIÓN DEL PROBLEMA Y PROPUESTA DE VALOR

### 3.1 Declaración del Problema
1.  **Dificultad de combinación:** El 68% de los hombres jóvenes reportan no saber cómo combinar prendas de diferentes textura, corte y tonalidad sin caer en outfits monótonos o discordantes.
2.  **Fricción visual:** Las imágenes estáticas de modelos en tiendas virtuales no reflejan la tipología corporal del usuario común, lo que genera insatisfacción post-compra y baja confianza al vestir.
3.  **Complejidad en el alta de datos:** Obligar al usuario a fotografiar decenas de prendas de su armario genera una alta tasa de abandono durante el *onboarding*.

### 3.2 Solución Propuesta y Propuesta de Valor
StyleMe proporciona:
*   **Digitalización con mínimo esfuerzo:** Un sistema de subida de fotos por lote más un catálogo predefinido de "básicos masculinos" (armario cápsula) para reducir la fricción inicial.
*   **Diagnóstico de Estética Automático:** Detección instantánea de la estética predominante en las prendas subidas.
*   **Recomendador Inteligente de Outfits:** Generación de combinaciones respetando la teoría del color (armonía en espacios HSV/CIELAB) y coherencia temática.
*   **Probador Virtual (VTON):** Renderizado fotorrealista de la persona vistiendo el outfit seleccionado mediante la preservación de la pose y la textura del tejido.

---

## 4. ARQUITECTURA TÉCNICA Y PIPELINE DE APRENDIZAJE AUTOMÁTICO

                              +-----------------------+
                              |   Imágenes de Prenda  |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              | Extracción / Segment. |
                              | (Remove background/   |
                              |  MediaPipe / BBox)    |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              |  Clasificador CLIP /  |
                              |  ResNet Fine-Tuned    |
                              +-----------+-----------+
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v                                           v
        +-----------------------+                   +-----------------------+
        | Categoría Funcional   |                   |  Vector Embedding de  |
        | (Camisa, Pantalón,    |                   |  Estética contemporánea|
        |  Calzado, etc.)       |                   |  (Old Money, etc.)    |
        +-----------+-----------+                   +-----------+-----------+
                    |                                           |
                    +---------------------+---------------------+
                                          |
                                          v
                              +-----------------------+
                              | Motor Compatibilidad  |
                              | (Color HSV/CIELAB +   |
                              |  Metric Learning)     |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              |  Outfit Recomendado   |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              | Pipeline VTON Generat.|
                              | (Pose + IDM-VTON/OOT) |
                              +-----------+-----------+
                                          |
                                          v
                              +-----------------------+
                              |  Imagen Resultante    |
                              +-----------------------+

### 4.1 Componente 1: Clasificador de Prendas y Detección de Estética

#### A. Desafío de Datos y Solución de Etiquetado
Los conjuntos de datos estándar como DeepFashion2 o Fashion Product Images (Kaggle) clasifican prendas en categorías funcionales ("Camisa Oxford"), pero fallan en determinar la estética (*Old Money*, *Soft Boy*, etc.).
*   **Modelo Base:** CLIP (*Contrastive Language-Image Pre-training*) de OpenAI.
*   **Enfoque Zero-Shot / Prompt Engineering:** Creación de representaciones textuales para cada estética (ej. *"A photo of an old money aesthetic men's outfit, linen shirt, quiet luxury"* vs *"A photo of a streetwear style baggy hoodie and cargo pants"*).
*   **Fine-Tuning Extremo (opcional/evaluativo):** Capas de clasificación lineal (*Linear Probing*) sobre las características extraídas por el encoder de imágenes de CLIP o un backbone ResNet-50 entrenado con un dataset curado de 1,500 imágenes (300 por cada estética objetivo).

#### B. Preprocesamiento de Imágenes
*   **Segmentación y Extracción de Prenda:** Aplicación de un modelo de remoción de fondo (`rembg` basado en U-2-Net) o detección de objetos mediante bounding boxes (`YOLOv8-Fashion`) para aislar la prenda.
*   **Normalización:** Reescalado a $224 \times 224$ píxeles, normalización de canales RGB acorde a ImageNet/CLIP.

### 4.2 Componente 2: Motor de Recomendación de Combinaciones (Outfit Compatibility Learning)

#### A. Evaluación Cromática
*   Transformación de colores dominantes extraídos al espacio de color CIELAB y HSV.
*   Cálculo de armonía cromática mediante reglas de complementariedad, analogía y triadas dentro del círculo cromático, penalizando combinaciones saturadas discordantes.

#### B. Espacio Latente de Compatibilidad
*   **Entrenamiento con Triplet Loss:** Cada prenda se proyecta a un espacio vectorial embedding de dimensión $D=128$.
*   **Métrica de Distancia:** Reducción de distancia euclidiana / similitud coseno entre prendas compatibles y aumento entre prendas incompatibles.
*   **Loss Function (Triplet Loss):**
    $$\mathcal{L}(A, P, N) = \max\left(0, D(f(A), f(P)) - D(f(A), f(N)) + \alpha\right)$$
    Donde $A$ es la prenda ancla, $P$ es una prenda positiva compatible, $N$ es una prenda negativa incompatible, y $\alpha$ es el margen de separación.

### 4.3 Componente 3: Pipeline de Probador Virtual (Virtual Try-On - VTON)
*   **Human Pose Estimation:** Uso de MediaPipe Pose u OpenPose para detectar keypoints del cuerpo del usuario.
*   **Human Parsing:** Uso de Self-Correction Human Parsing (SCHP) o SAM (Segment Anything Model) para generar máscaras binarias anatómicas.
*   **Generación con IDM-VTON / OOTDiffusion:** Inyección del trío *(Foto Usuario, Máscara Anatomía, Foto Prenda)* en el pipeline de difusión optimizado para ropa mediante API en la nube (Replicate / RunPod).

---

## 5. ESTRATEGIA DE DATOS Y CURACIÓN

### 5.1 Situación con la API de Pinterest
Se descarta el scraping masivo en Pinterest por restricciones de ToS.

### 5.2 Alternativa Defendible y Curación del Dataset
| Fuente de Datos | Propósito | Licencia / Uso |
| :--- | :--- | :--- |
| **DeepFashion2** | Entrenar/Validar detección de categorías (camisa, pantalón, chaqueta). | Académico |
| **Fashion Product Images (Kaggle)** | Base para clasificación rápida de atributos (color, tipo de tela, ocasión). | CC0 / Académico |
| **Custom Aesthetic Dataset (300 imgs/estilo)** | Descarga manual/curada desde Unsplash/Pexels para fine-tuning de estéticas. | Libre uso comercial/académico |
| **Catálogo "Básicos StyleMe"** | Conjunto predeterminado de 50 prendas digitales para onboarding rápido. | Dominio público / Curado |

---

## 6. ARQUITECTURA DE SOFTWARE Y TECNOLOGÍAS

### 6.1 Stack Tecnológico Recomendado
*   **Frontend:** Next.js (React) + Tailwind CSS + Lucide Icons + React Query.
*   **Backend REST / Microservicio de ML:** Python 3.10+ con FastAPI (asíncrono, OpenAPI nativo).
*   **Visión por Computadora & DL:** PyTorch, TorchVision, Hugging Face Transformers (CLIP), OpenCV, MediaPipe, `rembg`.
*   **Base de Datos & Almacenamiento:**
    *   PostgreSQL + `pgvector` (almacenamiento de embeddings de compatibilidad y búsqueda k-NN).
    *   AWS S3 / Cloudinary (almacenamiento de imágenes de prendas y resultados VTON).
*   **Infraestructura Generativa:** Replicate API (Inferencia GPU remota para IDM-VTON).

+-------------------------------------------------------------------------+
|                          ARQUITECTURA DE SOFTWARE                       |
+-------------------------------------------------------------------------+
|                                                                         |
|  [ FRONTEND ]                                                           |
|  Next.js + Tailwind CSS (Interfaz Móvil / Web)                          |
|         |                                                               |
|         v (Peticiones HTTPS / JSON)                                     |
|  [ BACKEND REST ]                                                       |
|  FastAPI (Python)                                                       |
|         |                                                               |
|         +---> [ BD / PGVECTOR ] (PostgreSQL: Usuarios, Prendas, Embeddings)
|         |                                                               |
|         +---> [ PIPELINE ML LOCAL ]                                     |
|         |     - Remoción de fondo (U-2-Net / rembg)                     |
|         |     - Detección / Fine-tuning CLIP                            |
|         |     - Motor de compatibilidad cromática/embeddings            |
|         |                                                               |
|         +---> [ API VTON EXTERNA ]                                      |
|               - Replicate / RunPod (Inferencia GPU IDM-VTON)            |
|                                                                         |
+-------------------------------------------------------------------------+


---

## 7. PLANIFICACIÓN DEL PROYECTO (CRONOGRAMA SEMESTRAL)

SEMANA  01 - 04 :  [ Phase 1: Datasets, Preprocesamiento & Clasificador CLIP ]
SEMANA  05 - 08 :  [ Phase 2: Motor de Compatibilidad y Algoritmo Recomendador ]
SEMANA  09 - 12 :  [ Phase 3: Integración de VTON (Prueba Virtual) & API External ]
SEMANA  13 - 16 :  [ Phase 4: Frontend UI, Pruebas End-to-End y Ajuste Final ]


### 7.1 Detalle por Fases
*   **Fase 1 (Semanas 1-4):** Curación de dataset, pipeline de remoción de fondo (`rembg`), evaluación CLIP Zero-Shot vs ResNet Fine-Tuned. *Entregable:* API `/api/v1/garments/analyze`.
*   **Fase 2 (Semanas 5-8):** Conversión a CIELAB/HSV, entrenamiento de Triplet Loss (embedding de $128$ dim), configuración de `pgvector`. *Entregable:* API `/api/v1/outfits/recommend`.
*   **Fase 3 (Semanas 9-12):** Integración MediaPipe, integración con Replicate IDM-VTON, gestión de tareas asíncronas. *Entregable:* API `/api/v1/vton/try-on`.
*   **Fase 4 (Semanas 13-16):** Desarrollo de interfaz Next.js, integración completa backend-frontend, métricas definitivas y documentación. *Entregable:* Aplicación funcional desplegada.

---

## 8. MATRIZ DE RIESGOS Y MITIGACIÓN

| Riesgo Técnico / Operativo | Impacto | Probabilidad | Estrategia de Mitigación |
| :--- | :--- | :--- | :--- |
| Tiempos elevados de inferencia en VTON (>15s). | Alto | Media | Procesamiento asíncrono (Webhooks/Polling) con estados de carga interactivos en la UI. |
| Fotos de baja calidad subidas por el usuario. | Medio | Alta | Validación previa con varianza de Laplaciano (detección de borrosidad) y MediaPipe antes de la inferencia. |
| Costo de llamadas a APIs GPU en la nube. | Alto | Media | Sistema de caché de resultados VTON para outfits y prendas repetidas en PostgreSQL. |
| Baja precisión en estéticas ambiguas. | Medio | Media | Respuesta Top-N estéticas con score de confianza en lugar de un único valor determinista. |

---

## 9. CRITERIOS DE EVALUACIÓN Y MÉTRICAS ACADÉMICAS

1.  **Clasificación de Prendas y Estilos:**
    *   F1-Score Macro $> 0.82$ para categorías funcionales.
    *   F1-Score Macro $> 0.75$ para estéticas contemporáneas.
    *   Matriz de confusión para analizar solapamiento entre estéticas (*Streetwear* vs *Starboy*).
2.  **Motor de Compatibilidad:**
    *   *Fill-In-The-Blank (FITB) Accuracy* $> 70\%$ en pruebas estándar.
3.  **Probador Virtual (VTON):**
    *   SSIM (Structural Similarity Index Measure) y LPIPS (Perceptual Distance) para medir la conservación de pose y textura.

---

## 10. ESQUEMA DE ENTIDADES Y MODELO DE DATOS INICIAL

### 10.1 Entidades Principales (PostgreSQL)

[ User ] 1 --- N [ Garment ]
[ User ] 1 --- N [ Outfit ]
[ Outfit ] N --- M [ Garment ] (a través de OutfitGarment)
[ User ] 1 --- N [ VTONJob ]


*   **Users:** `id` (UUID), `email` (string), `name` (string), `created_at` (timestamp).
*   **Garments:** `id` (UUID), `user_id` (UUID, nullable for capsule items), `image_url` (string), `processed_image_url` (string), `category` (enum), `aesthetic_scores` (JSONB), `dominant_colors_hsv` (JSONB), `compatibility_embedding` (vector(128)), `created_at` (timestamp).
*   **Outfits:** `id` (UUID), `user_id` (UUID), `score` (float), `aesthetic` (string), `created_at` (timestamp).
*   **OutfitGarments:** `outfit_id` (UUID), `garment_id` (UUID), `position` (enum: top, bottom, footwear, outerwear).
*   **VTONJobs:** `id` (UUID), `user_id` (UUID), `user_photo_url` (string), `outfit_id` (UUID), `status` (enum: pending, processing, completed, failed), `result_url` (string), `error_message` (string), `created_at` (timestamp).

---

## 11. DEFINICIÓN DE INTERFACES API (CONTRATOS REST)

1.  `POST /api/v1/garments/upload`
    *   *Input:* `multipart/form-data` (file: Image).
    *   *Output:* JSON (`garment_id`, `category`, `top_aesthetics`, `dominant_colors`, `processed_image_url`).
2.  `POST /api/v1/outfits/recommend`
    *   *Input:* JSON (`user_id`, `target_aesthetic` [optional], `available_garment_ids` [optional]).
    *   *Output:* JSON (`outfits`: Array de outfits con prendas, puntaje cromático y puntaje de embedding).
3.  `POST /api/v1/vton/try-on`
    *   *Input:* `multipart/form-data` (`user_image`, `outfit_id`).
    *   *Output:* JSON (`job_id`, `status`: "processing", `estimated_time_seconds`: 12).
4.  `GET /api/v1/vton/status/{job_id}`
    *   *Input:* Path param `job_id`.
    *   *Output:* JSON (`job_id`, `status`, `result_url` [if completed]).

---
