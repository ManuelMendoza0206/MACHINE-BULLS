# Constitution — StyleSync IA

> Generado a partir de: Team Charter, Project Goal y Estructura ClickUp del equipo (Manuel Delgadillo, Jaicel Jesús, Huascar Durán Avendaño, Leonardo Ibarra López) — actualizado 2026-08-27.

## 1. Product Goal (fuente de verdad)

Resolver el problema de **"qué me pongo" en la moda masculina** mediante una plataforma **web + móvil** que digitaliza el armario del usuario, recomienda combinaciones de ropa basadas en reglas estéticas y de color, y permite visualizar los resultados a través de un **probador virtual (VTON)**. El objetivo es entregar **inteligencia propia** — motor de recomendación y reglas de compatibilidad de creación propia — no solo conectar servicios de terceros. Para compradores y comercios de indumentaria online, el sistema reduce devoluciones y aumenta conversión mediante un pipeline MLOps desplegado en la nube.

## 2. Principios de Calidad y Alcance

- **Inteligencia propia, no wrapper**: la lógica central del motor de compatibilidad (Fase 2) y clasificación estética/cromática (Fase 1) debe ser de creación propia. Se permite autocompletado de código repetitivo y ayuda con librerías, pero el diseño del scoring/compatibilidad no se delega a una API externa.
- **Alcance acotado en 18 semanas**: cualquier feature nueva debe justificarse contra la restricción de tiempo del semestre. Si no cabe, se recorta o se pasa a "future enhancement".
- **Complejidad técnica genuina, no trivial**: el proyecto se eligió por sobre alternativas más simples (Arte-Match, Tutor Musical) precisamente porque combina IA generativa (VTON) + recomendación de estilo + MLOps real. No se debe simplificar el proyecto a un CRUD con un modelo pegado encima.
- **Pipeline MLOps completo obligatorio**: entrenamiento/reentrenamiento, versionado de modelos, inferencia en la nube con GPU, y monitoreo de calidad. El despliegue real es un requisito no negociable, no un "nice to have".
- **Riesgo gestionado, no eliminado**: se acepta riesgo Medio en calidad de generación (distorsiones de cuerpo/tela) siempre que esté acotado por catálogo reducido y monitoreo activo (ver Registro de Riesgos en ClickUp).
- **Responsabilidad compartida y rigor académico**: todos los miembros comprenden la arquitectura general del sistema (web + móvil + backend). Comunicación transparente sobre avances — ver §3.1.

## 3. Gobernanza del Equipo (no negociable)

- **Rama `main` protegida**: prohibidos los commits directos. Todo cambio entra vía Pull Request.
- **Aprobación mínima**: 1 revisor por PR antes de merge, distinto al creador. El revisor comprueba que no rompe funcionalidad existente.
- **Rechazo automático de PR** si contiene: credenciales/API keys/tokens/datos personales sensibles, pruebas fallidas, o falta de criterios de aceptación documentados.
- **Declaración de uso de IA obligatoria** en cada PR: qué % o sección fue asistida por IA (Gemini, ChatGPT, Copilot, Claude) y qué pruebas validaron ese código. La responsabilidad técnica es siempre del equipo, nunca de la IA.
- **Prohibido ingresar secretos o datos personales** en prompts de herramientas de IA.
- **Ninguna IA puede aprobar un Pull Request**: la aprobación es humana y responsable.
- **Auditoría de código IA**: todo código generado o sugerido por IA debe ser revisado obligatoriamente — por un agente automatizado de QA o manualmente por un integrante — antes del merge.

### 3.1 Canales, Tiempos y Sincronización

- **Canales**: WhatsApp para urgencias/logística rápida. Discord o Slack para discusiones técnicas, enlaces y alertas del repositorio.
- **Tiempo de respuesta**: máximo **12 horas** para confirmación de lectura o respuesta.
- **Sincronización**: 1 reunión semanal corta (Google Meet o presencial) para planificar la semana y revisar avance.

### 3.2 Manejo de Bloqueos

- **Regla de las 24 horas**: si un integrante pasa más de 24 horas atascado en el mismo error/problema lógico, es obligatorio avisar en el chat grupal.
- **Resolución**: se organiza una llamada rápida de revisión conjunta (pair programming) para destrabar y evitar desvíos del cronograma.

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

## 8. DOME — Fases del Proyecto

| Fase | Meta |
| :--- | :--- |
| **1 — Análisis y Clasificación** | Backend recibe foto de prenda, quita fondo y clasifica tipo/estética |
| **2 — Motor de Compatibilidad** | Analiza color/estilo y sugiere outfits armónicos (motor propio) |
| **3 — Probador Virtual VTON** | Proyecta outfit sobre foto del usuario respetando postura/proporciones |
| **4 — Lanzamiento y UI** | Plataforma web + móvil pulida, todo conectado, usable end-to-end |

## 9. Equipo

- Manuel Delgadillo
- Jaicel Jesús
- Huascar Durán Avendaño
- Leonardo Ibarra López
