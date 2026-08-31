# Constitution — StyleSync IA

> Generado a partir de: Team Charter, Priorización de Casos y Estructura ClickUp del equipo (Manuel Jiménez, Leonardo Ibarra, Huascar Durán, Jaicel Velasco).

## 1. Product Goal (fuente de verdad)

Para compradores y comercios de indumentaria online, construiremos un sistema inteligente de probador virtual y asesor de estilo que permite visualizar prendas sobre el cuerpo del usuario y generar combinaciones coherentes según estilos, reduciendo devoluciones y aumentando la conversión de venta, utilizando un pipeline MLOps desplegado en la nube.

## 2. Principios de Calidad y Alcance

- **Alcance acotado en 18 semanas**: cualquier feature nueva debe justificarse contra la restricción de tiempo del semestre. Si no cabe, se recorta o se pasa a "future enhancement".
- **Complejidad técnica genuina, no trivial**: el proyecto se eligió por sobre alternativas más simples (Arte-Match, Tutor Musical) precisamente porque combina IA generativa (VTON) + recomendación de estilo + MLOps real. No se debe simplificar el proyecto a un CRUD con un modelo pegado encima.
- **Pipeline MLOps completo obligatorio**: entrenamiento/reentrenamiento, versionado de modelos, inferencia en la nube con GPU, y monitoreo de calidad. El despliegue real es un requisito no negociable, no un "nice to have".
- **Riesgo gestionado, no eliminado**: se acepta riesgo Medio en calidad de generación (distorsiones de cuerpo/tela) siempre que esté acotado por catálogo reducido y monitoreo activo (ver Registro de Riesgos en ClickUp).

## 3. Gobernanza del Equipo (no negociable)

- **Rama `main` protegida**: prohibidos los commits directos. Todo cambio entra vía Pull Request.
- **Aprobación mínima**: 1 revisor por PR antes de merge.
- **Rechazo automático de PR** si contiene: credenciales/API keys/tokens/datos personales sensibles, pruebas fallidas, o falta de criterios de aceptación documentados.
- **Declaración de uso de IA obligatoria** en cada PR: qué % o sección fue asistida por IA (Gemini, ChatGPT, Copilot, Claude) y qué pruebas validaron ese código. La responsabilidad técnica es siempre del equipo, nunca de la IA.
- **Prohibido ingresar secretos o datos personales** en prompts de herramientas de IA.

## 4. Definition of Done (DoD)

Una tarea se considera Terminada solo si:
1. Cumple todos los criterios de aceptación definidos en ClickUp.
2. Está integrada en `main` vía PR aprobado.
3. No contiene credenciales/secretos/datos sensibles.
4. Las pruebas (si aplica) pasan exitosamente o se justifica por qué no aplican.
5. Declara uso de IA y su validación.
6. Tiene evidencia trazable (commit/PR/documento) enlazada en la tarjeta de ClickUp.

## 5. Trazabilidad

- Toda decisión de alcance, datos, arquitectura o evaluación debe quedar registrada en ClickUp o GitHub — si no está registrada, no cuenta como avance.
- Cada tarea en ClickUp requiere: Sprint, Dueño, Criterio de Aceptación, Enlace a Evidencia, Riesgo Asociado, Estado de Bloqueo — completos antes de pasar a "In Progress".

## 6. Datos y Privacidad

- Uso de datasets públicos de try-on (VITON-HD, DressCode) + catálogo propio del comercio.
- Cualquier dato de usuario (fotos personales subidas para el probador virtual) se trata como dato sensible: no se usa en prompts de IA de terceros sin anonimizar, y su almacenamiento/retención debe quedar documentado en la lista **Data** de ClickUp.

## 7. Riesgos Conocidos a Vigilar

- Costo de inferencia GPU y latencia del modelo generativo (VTON).
- Calidad realista del try-on (distorsiones de cuerpo/tela) — requiere monitoreo continuo, no solo validación inicial.
- Dependencia del catálogo de un comercio específico limita la generalización del recomendador de estilos.
- **Licenciamiento del modelo VTON (riesgo Legal/Alto, hallazgo de auditoría agosto 2026):** los modelos de referencia para el pipeline generativo (IDM-VTON, OOTDiffusion) se publican bajo licencia **no comercial**. Consumirlos vía una API gestionada (Replicate/RunPod, `plan-base.md` §6.1) delega la infraestructura pero no despeja el uso comercial de la salida generada — la licencia de los pesos subyacentes no cambia. Debe resolverse antes de la Fase 3 del cronograma (integración VTON, `plan-base.md` §7.1) por una de tres rutas, decisión pendiente del equipo completo (no solo frontend):
  1. Confirmar un proveedor con licencia comercial explícita para el modelo servido (distinta del checkpoint de investigación crudo).
  2. Mantener el alcance del proyecto estrictamente académico/no comercial y documentarlo como restricción de producto — consistente con el carácter de proyecto de semestre (§2).
  3. Entrenar/ajustar un modelo propio sobre una arquitectura con licencia permisiva.

## 8. Decisiones de Arquitectura Registradas

- **Plataforma de frontend: aplicación web (Next.js), no app móvil.** El plan técnico original de Feature 001 (`.speckit/features/001-probador-virtual/plan.md`, commit `9fecf33`) eligió React Native + AWS (SageMaker/RDS/S3/SQS). El commit `6c89b64` introdujo `docs/context/plan-base.md` y todo `openspec/specs/` sobre un stack distinto (Next.js web + FastAPI/PyTorch + PostgreSQL/pgvector + Supabase Auth + Replicate/RunPod) **sin que el pivote quedara registrado como decisión** en su momento, en violación de facto de §5. Se registra aquí retroactivamente: **el stack vigente es el de `plan-base.md` §6.1**, ratificado con el Product Owner (Leonardo Ibarra) el 2026-08-24. Pendiente: ratificación explícita del resto del equipo (Manuel, Huascar, Jaicel) en la próxima ceremonia, con entrada en ClickUp — hasta entonces esta entrada es la evidencia mínima de trazabilidad exigida por §5, no un reemplazo de la ceremonia del equipo.
- **Autenticación: Supabase Auth**, no credenciales propias — justificado en que `User` (`plan-base.md` §10.1) no define `password_hash` y el stack ya compromete PostgreSQL+pgvector, que Supabase provee gestionado. Detalle en `openspec/specs/frontend/landing-and-auth-flow/spec.md` §1.1.
- **Modelo de datos: tabla `GarmentOwnership`** añadida a `plan-base.md` §10.1 para soportar la adopción del catálogo cápsula por múltiples usuarios sin duplicar prendas ya analizadas. Detalle y justificación en `docs/context/backend-plan.md` §5.2. Ratificado con el Product Owner el 2026-08-26.
- **Almacenamiento de objetos: Cloudinary** (no S3 ni Supabase Storage) — transformaciones on-the-fly necesarias para el pipeline de garment analysis. Detalle en `docs/context/backend-plan.md` §12.1. Ratificado 2026-08-26.
- **Alcance del proyecto: académico/no comercial, sin cliente final (Ruta 2 del riesgo de licenciamiento VTON, §7)** — confirmado con el Product Owner (2026-08-26): no es una concesión, es la formalización de lo que §2 de esta constitución ya declaraba. Habilita usar un checkpoint community de IDM-VTON/OOTDiffusion vía Replicate sin bloquear Fase 3, y sin violación de licencia real (el uso cae dentro de lo permitido, no en zona gris). Análisis completo en `docs/context/backend-plan.md` §12.2. **Pendiente de ratificación formal por el resto del equipo (Manuel, Huascar, Jaicel)** — mismo estándar que el pivote de plataforma de §8.
- **Riesgo activo derivado (no licenciamiento, sino uso responsable):** las licencias RAIL de los modelos VTON restringen, independientemente de si el uso es comercial, generar contenido que represente a una persona real de forma no consentida o dañina. Como el pipeline procesa fotos reales de usuarios, este es ahora el eje de riesgo a controlar — ver acción pendiente en §6 de esta constitución (mecanismo de consentimiento/retención aún no definido en detalle, solo mencionado).
- **Human parsing VTON: SCHP** (no SAM) — compatible por diseño con IDM-VTON/OOTDiffusion, sin capa de clasificación adicional que construir. Detalle en `docs/context/backend-plan.md` §12.3. Ratificado 2026-08-26 (decisión técnica, no requiere ceremonia de equipo).
