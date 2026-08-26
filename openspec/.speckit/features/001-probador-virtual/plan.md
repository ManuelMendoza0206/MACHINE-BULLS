# Plan Técnico — Feature 001: Probador Virtual

> **⚠️ SUPERSEDED — plataforma y stack ya no vigentes.** Este documento eligió **app móvil React Native + AWS (SageMaker/RDS/S3/SQS)**. La dirección actual del proyecto, formalizada en `docs/context/plan-base.md` (§6.1) y desarrollada en detalle en `openspec/specs/` (00-08), es **aplicación web Next.js + Supabase** (Auth, Postgres+pgvector) con inferencia VTON vía API gestionada (Replicate/RunPod) en vez de SageMaker propio.
>
> **Por qué queda esta nota en vez de borrar el archivo:** `constitution.md` §5 exige que toda decisión de arquitectura quede trazable — este documento es la evidencia de la decisión anterior y el motivo de compararla, no basura a eliminar. El pivote de móvil a web ocurrió entre el commit `9fecf33` (este plan) y `6c89b64` (creación de `plan-base.md` y `openspec/`) sin una entrada explícita de decisión en ese momento; esta nota registra el pivote retroactivamente, según lo acordado con el Product Owner (2026-08-24).
>
> **Sigue vigente de este documento** (no depende de la plataforma): las user stories y FRs de `specify.md`, los edge cases de privacidad de foto de usuario, y la justificación de "modelo pre-entrenado + fine-tuning" — todo lo específico de infraestructura (React Native, SageMaker, RDS, SQS) está reemplazado por `plan-base.md` §6.1 y `openspec/specs/frontend/api-client-and-schemas/spec.md`.
>
> Si el equipo no ratifica este pivote en la próxima ceremonia (registrarlo en ClickUp/GitHub por `constitution.md` §5), este documento vuelve a ser la fuente de verdad y `openspec/specs/` debe reescribirse.

## Stack Elegido

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend | App móvil — **React Native** (recomendado sobre Flutter) | Un solo equipo de 2 devs; React Native comparte más ecosistema JS con un futuro panel web de comercio si lo necesitan más adelante. A confirmar con el equipo si prefieren Flutter. |
| Backend / API | **Python + FastAPI** | Async nativo (clave para no bloquear mientras se espera la GPU), tipado con Pydantic, fácil integración con librerías de ML (torch, diffusers). |
| Inferencia GPU (VTON) | **AWS SageMaker Endpoints** (no EC2 crudo) | Autoscaling y facturación por uso real en vez de mantener una instancia GPU encendida 24/7 — crítico dado el riesgo de costo ya identificado en la Constitution. |
| Almacenamiento de imágenes | **Amazon S3** | Fotos de usuario (sensibles) y prendas del armario digital, con buckets separados y políticas de retención distintas. |
| Base de datos | **PostgreSQL (Amazon RDS)** | Metadata de usuarios, prendas, historial de generaciones. Relacional porque hay relaciones claras (usuario→armario→generaciones). |
| Cola de trabajos | **Amazon SQS + worker asíncrono** | La generación VTON no es instantánea; el flujo debe ser: usuario pide generación → se encola → worker invoca SageMaker → resultado se notifica al app. |
| Modelo VTON | Modelo generativo pre-entrenado tipo **IDM-VTON / OOTDiffusion** (open-source), fine-tuneado sobre VITON-HD + catálogo propio | Evita entrenar VTON desde cero, que no cabe en 18 semanas. El fine-tuning es lo que sí entra en el pipeline MLOps. |

## Arquitectura (alto nivel)

1. App móvil (React Native) → sube foto + selecciona prendas.
2. Backend FastAPI recibe la solicitud, valida imágenes, encola job en SQS.
3. Worker toma el job, invoca el endpoint de SageMaker con la foto base + prenda(s).
4. SageMaker corre el modelo VTON fine-tuneado y devuelve la imagen generada a S3.
5. Backend notifica al app (push o polling) que el resultado está listo.
6. App muestra el resultado; usuario puede pedir otra combinación reutilizando la foto base ya en S3 (cumple FR-005).

## Por qué estas decisiones (vínculo con la Constitution y el Specify)

- **SageMaker Endpoints en vez de EC2 fijo**: la Constitution marca el costo/latencia GPU como riesgo a vigilar; un endpoint con autoscaling evita pagar GPU ociosa.
- **Cola asíncrona (SQS)**: FR-006 exige avisar cuando una generación falla en vez de ocultarlo — el patrón asíncrono permite manejar timeouts y reintentos de forma explícita, no silenciosa.
- **S3 con buckets separados para fotos de usuario**: conecta directo con la sección de Datos y Privacidad de la Constitution (fotos de usuario = dato sensible, requiere política de retención propia, distinta a las prendas de catálogo).
- **Modelo pre-entrenado + fine-tuning, no entrenamiento desde cero**: es la única forma realista de que FR-004 (try-on generativo) quepa en 18 semanas, tal como se justificó en la matriz de priorización original.

## Dependencias Clave

- Cuenta AWS con acceso a SageMaker (GPU quota — pedir con anticipación, a veces AWS tarda en aprobar cuotas de GPU para cuentas nuevas).
- Dataset VITON-HD / DressCode para fine-tuning inicial.
- Librería de generación (diffusers de Hugging Face) compatible con el modelo VTON elegido.

## Fases de Implementación (borrador para `/speckit.tasks`)

1. **Setup de infraestructura**: RDS, S3 buckets, SQS, repo backend FastAPI.
2. **Armario digital**: endpoints de subida/listado de prendas (FR-001, FR-007).
3. **Foto base**: endpoint de subida de foto de usuario con validaciones (FR-002, edge case de calidad).
4. **Pipeline de inferencia**: integración SageMaker + worker + manejo de fallos (FR-004, FR-006).
5. **Flujo de regeneración**: reutilizar foto base para nuevas combinaciones (FR-005).
6. **App móvil**: pantallas de armario, selección de prendas, resultado.
7. **Monitoreo y evaluación de calidad**: métricas de éxito/fallo de generación (SC-003).

## Puntos Abiertos para el Equipo

- **Flutter vs. React Native**: propuse React Native por defecto; si el equipo ya tiene experiencia previa en Flutter, cambia la elección.
- **Umbral de tiempo aceptable de generación (SC-002)**: pendiente de medir con el modelo VTON elegido antes de fijar un número.
- **Push notifications vs. polling** para avisar cuando el resultado está listo — a definir según complejidad deseada para el MVP.
