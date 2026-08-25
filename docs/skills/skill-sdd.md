---
name: spec-driven-development
description: Guía el desarrollo de software siguiendo Spec-Driven Development (SDD), la metodología de github/spec-kit — donde la especificación es la fuente de verdad y el código es su expresión. Úsalo SIEMPRE que el usuario quiera construir una feature o proyecto de software nuevo, mencione "spec", "especificación", "spec-driven", "spec kit", "SDD", "PRD", "constitución del proyecto", "plan de implementación", "user stories", o simplemente describa una idea de producto/feature que hay que construir con un agente de código — incluso si no pide explícitamente el proceso formal. También úsalo cuando el usuario pida clarificar requisitos ambiguos, generar un plan técnico a partir de una spec, desglosar un plan en tareas, o auditar una feature existente contra su especificación. No uses este skill para bugs triviales de una línea o preguntas puntuales de código sin alcance de feature.
---

# Spec-Driven Development (SDD)

Basado en la metodología de [github/spec-kit](https://github.com/github/spec-kit).
Filosofía central: **la especificación manda, el código obedece**. En vez de
escribir código y documentar después, escribimos primero QUÉ hay que construir
y POR QUÉ (spec), luego CÓMO (plan técnico), luego lo desglosamos en tareas
ejecutables, y solo entonces se escribe código — test-first.

No dependas del CLI `specify` (requiere red/`uv` que puede no estar disponible
en este entorno). Este skill replica el mismo flujo y las mismas plantillas
directamente con tus herramientas de archivos — tú haces de agente SDD.

## El flujo completo

```
constitution → specify → clarify → plan → tasks → analyze → implement
   (una vez        (por cada     (opcional,   (opcional)
   por proyecto)    feature)      recomendado)
```

Estructura de archivos que debes crear/mantener en el proyecto del usuario:

```
memory/
  constitution.md              # principios del proyecto (una vez)
specs/
  001-nombre-feature/
    spec.md                    # qué y por qué
    plan.md                    # cómo (arquitectura, stack)
    research.md                # decisiones técnicas investigadas (si aplica)
    data-model.md              # entidades (si aplica)
    contracts/                 # especificación de APIs/eventos (si aplica)
    quickstart.md              # escenarios de validación manual
    tasks.md                   # lista de tareas ejecutables
```

## Cómo decidir en qué fase entrar

Pregunta al usuario (o infiere de la conversación) en qué punto está:
- ¿Es la primera feature de este proyecto y no existe `memory/constitution.md`? → empieza por **Constitución**.
- ¿Tiene una idea/descripción de feature pero no una spec escrita? → **Specify**.
- ¿Ya tiene un spec.md pero tiene ambigüedades sin resolver? → **Clarify**.
- ¿Tiene spec.md aprobado y quiere el diseño técnico? → **Plan**.
- ¿Tiene plan.md y quiere ejecutar? → **Tasks**, luego **Implement**.
- ¿Quiere una auditoría de consistencia entre spec/plan/tasks/código? → **Analyze**.

No fuerces las siete fases si el usuario solo quiere iterar rápido ("vibe
coding") — puedes saltar pasos si lo pide explícitamente, pero siempre
avísale qué te estás saltando y el riesgo (specs desalineadas con el código).

---

## Fase 1 — Constitution (una vez por proyecto)

Si no existe `memory/constitution.md`, créalo usando la plantilla en
`templates/constitution.md`. Entrevista al usuario brevemente sobre:
- Calidad de código, testing, estándares de UX, requisitos de performance
- Cualquier restricción organizacional (stack obligatorio, cumplimiento, etc.)

Rellena los Artículos IV-VI con los principios propios del proyecto — no los
dejes genéricos. Los Artículos I, II, III, VII, VIII, IX son fijos (ver
`references/nine-articles.md` para el detalle completo de cada uno).

## Fase 2 — Specify

El usuario describe una feature en lenguaje natural. Tu trabajo:

1. Determina el siguiente número de feature escaneando `specs/` (001, 002, ...).
2. Crea `specs/NNN-nombre-corto/spec.md` a partir de `templates/spec.md`.
3. Redacta enfocándote en el QUÉ y el POR QUÉ — **nunca** stack técnico, APIs
   o estructura de código en este documento.
4. **No adivines.** Cualquier cosa que el prompt del usuario no especifique
   se marca `[NECESITA CLARIFICACIÓN: pregunta concreta]` en vez de asumir
   un valor razonable. Esto es la regla más importante de esta fase.
5. Deriva historias de usuario priorizadas (P1/P2/P3), cada una probable de
   forma independiente, con escenarios Dado/Cuando/Entonces.
6. Termina con la checklist de completitud del spec y revísala tú mismo antes
   de mostrárselo al usuario.

## Fase 3 — Clarify (recomendado antes de Plan)

Repasa el spec.md buscando ambigüedades no marcadas. Usa `ask_user_input_v0`
para resolver los `[NECESITA CLARIFICACIÓN]` de mayor impacto (máximo ~5 por
ronda para no abrumar). Actualiza el spec.md con las respuestas y elimina los
marcadores resueltos.

## Fase 4 — Plan

Con spec.md aprobado y el stack/arquitectura que indique el usuario:

1. Crea `specs/NNN-nombre/plan.md` desde `templates/plan.md`.
2. Verifica los gates de la Fase -1 (simplicidad, anti-abstracción,
   integration-first) contra la constitución del proyecto. Si algo no pasa,
   documenta la justificación en "Registro de complejidad" — no lo ocultes.
3. Si hay decisiones técnicas no triviales (elegir librería, patrón, etc.),
   investígalas (web_search si aplica) y documenta el porqué en la tabla de
   decisiones — no solo el qué.
4. Si la feature tiene modelo de datos o contratos de API, créalos también en
   `data-model.md` y `contracts/` (mantén plan.md de alto nivel, el detalle
   va en esos archivos separados).
5. Genera `quickstart.md` con los escenarios clave de validación manual.

## Fase 5 — Tasks

A partir de plan.md (+ data-model.md, contracts/, research.md si existen):

1. Crea `specs/NNN-nombre/tasks.md` desde `templates/tasks.md`.
2. Sigue el orden test-first: contratos → pruebas → modelos → implementación
   → integración → pulido.
3. Marca `[P]` las tareas paralelizables (no comparten archivos ni dependen
   entre sí).
4. Cada tarea debe ser lo bastante concreta para ejecutarse sin reabrir el
   spec.

## Fase 6 — Analyze (opcional, auditoría de consistencia)

Cuando el usuario pida validar que todo está alineado (o antes de implementar
algo grande), revisa cruzadamente:
- ¿Todo requisito funcional del spec tiene al menos una tarea que lo cubre?
- ¿Alguna tarea no traza a ningún requisito? (posible feature especulativa)
- ¿El plan respeta la constitución del proyecto?
- ¿Quedan marcadores `[NECESITA CLARIFICACIÓN]` sin resolver?

Repórtalo como una tabla corta de hallazgos, no como prosa larga.

## Fase 7 — Implement

Ejecuta las tareas de tasks.md en orden, respetando test-first (Artículo III):
escribe la prueba, confírmala en rojo, luego el código mínimo para ponerla en
verde. Ve marcando cada tarea como completada. Si en el camino descubres que
el plan o el spec necesitan cambiar, vuelve a esa fase en vez de improvisar
en silencio — SDD vive de que la spec y el código no se desalineen.

---

## Notas de estilo

- Todo el contenido generado (spec, plan, tasks) va en **archivos reales**
  dentro del proyecto del usuario (usa `create_file`/`str_replace`), no solo
  como texto en el chat — son artefactos vivos que se versionan con git.
- Sé "pushy" con los marcadores de clarificación: es mejor preguntar de más
  que asumir un requisito incorrecto que luego genera código equivocado.
- Cuando el usuario ya tenga un repo con código, antes de escribir specs
  nuevas revisa `memory/constitution.md` y `specs/` existentes si los hay,
  para mantener consistencia con lo ya establecido.

## Referencias
- `references/nine-articles.md` — detalle completo de los 9 artículos constitucionales
- `templates/constitution.md`, `templates/spec.md`, `templates/plan.md`, `templates/tasks.md`
