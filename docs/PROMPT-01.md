# PROMPT 01 — Exploración inicial StyleMe (solo lectura, sin código)

> **Uso:** Copiar y pegar tal cual en Claude Code. Este prompt es **solo de exploración y diagnóstico**. No debe generar ni modificar código, specs ni commits.

---

## Prompt para Claude Code

```text
Actúa como arquitecto senior explorando el monorepo MACHINE-BULLS / StyleMe. 

MODO: Solo exploración y análisis. PROHIBIDO escribir código, crear/editar archivos, correr comandos de escritura, proponer implementación o hacer commits. Solo lectura, diagnóstico y reporte.

Objetivo: entender el estado actual del repo y detectar gaps/riesgos antes de cualquier implementación.

1. LEE OBLIGATORIAMENTE en este orden (no asumas nada sin leer):
   - CLAUDE.md (fuente operativa del repo)
   - .speckit/constitution.md
   - docs/context/base-plan.md
   - docs/context/frontend-plan.md
   - openspec/config.yaml
   - openspec/specs/*.md (00 a 07) — identifica dependencias entre specs
   - docs/clickup/team_charter.md y docs/clickup/clickup_estructura.md si existen

2. MAPEA LA ESTRUCTURA REAL DEL REPO:
   - Verifica qué directorios existen realmente: web/, mobile/, backend/, src/, app/, etc. vs. lo declarado en CLAUDE.md §4
   - Lista qué está vacío, qué tiene código, qué solo tiene scaffolding
   - Identifica stack real instalado (package.json, pyproject.toml, tsconfig.json, etc.) vs. stack declarado en CLAUDE.md §2

3. AUDITA CONTRATOS Y CONSISTENCIA:
   - Compara contratos HTTP/JSON de docs/context/base-plan.md §11 con los Zod schemas de openspec/specs/01-api-client-and-schemas.md y Pydantic del backend (si existe)
   - Señala divergencias, enums no cerrados, gaps de endpoints faltantes (ej. GET listado de garments/outfits/history mencionado en frontend-plan.md §6 como GAP)
   - Valida disciplina de contratos: Zod espeja Pydantic, extra="forbid", strict, etc.

4. ANALIZA SDD Y TRAZABILIDAD:
   - ¿Las specs cubren las 9 pantallas de frontend-plan.md §4 y los 4 flujos (A/B/C/D)?
   - ¿Qué specs tienen dependencias bloqueantes? (ej. 01 es prerrequisito de 02/03/04)
   - ¿Las fases DOME (Análisis → Compatibilidad → VTON → Lanzamiento) están reflejadas en la estructura de openspec/changes/?

5. DETECTA RIESGOS Y DEUDA TEMPRANA:
   - Riesgos de constitution §7 (costo GPU, latencia VTON >15s, calidad try-on, catálogo limitado)
   - Gaps de ENV (NEXT_PUBLIC_API_BASE_URL, S3, SQS, SageMaker)
   - Ausencia de tests, lint, typecheck, CI, .env.example

6. ENTREGA UN REPORTE ESTRUCTURADO (sin proponer código):
   ## 1. Resumen ejecutivo (5 líneas máximo)
   ## 2. Mapa real del repo (tabla: ruta | existe | estado | nota)
   ## 3. Stack declarado vs. instalado (tabla)
   ## 4. Contratos: consistencias y divergencias encontradas
   ## 5. Coverage de specs vs. frontend-plan y base-plan (qué falta/sobra)
   ## 6. Gaps bloqueantes y gaps no bloqueantes (priorizados)
   ## 7. Riesgos constitution §7 con impacto en exploración
   ## 8. Preguntas abiertas para el equipo (máximo 5, priorizadas)
   ## 9. Próximo paso recomendado (solo qué explorar/proponer después, no implementar)

REGLAS:
- No escribas código. No edites archivos. No crees branches.
- Usa Explore/Plan agents si están disponibles.
- Cita siempre file_path:line_number cuando afirmes algo.
- Si algo no existe, dilo explícitamente: "NO EXISTE" + ruta esperada según CLAUDE.md.
- Si encuentras contradicción entre docs, repórtala como CONFLICTO con evidencia de ambos lados.
- Respuesta en español, concisa, sin relleno.
```

---

## Notas para el operador

- Este prompt asume que `CLAUDE.md` es la fuente operativa y `docs/context/base-plan.md` + `docs/context/frontend-plan.md` son la fuente de producto. Si Claude Code reporta archivos faltantes, es esperado: el diagnóstico es el entregable.
- Siguiente prompt lógico (no incluido aquí): `PROMPT-02-PROPUESTA` para generar el `openspec/changes/<nombre>/proposal.md` a partir de los gaps priorizados de este reporte.
- Verificación rápida tras pegar el prompt: el reporte debe contener las 9 secciones y al menos una tabla de mapa real del repo. Si no, re-ejecutar con `THINK HARDER`.
