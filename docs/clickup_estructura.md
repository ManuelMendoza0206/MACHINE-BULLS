# Estructura y Operativa del Tablero ClickUp

## Listas del Espacio de Trabajo (Space)

El proyecto se organizará en siete listas estándar para garantizar el flujo y la trazabilidad del trabajo según el ciclo de vida de desarrollo de IA:

| Lista | Propósito y Tipo de Trabajo | Entregables Típicos |
|---|---|---|
| **Discovery** | Definición del problema, investigación, Product Goal, Team Charter y priorización de casos. | `team_charter.md`, `priorizacion_casos.md`, actas de reunión. |
| **Data** | Identificación de fuentes, limpieza, eda, contratos de datos, preparación y versionado. | Datasets, scripts de ETL, data datasheets, validaciones de esquema. |
| **Architecture** | Diagramas de arquitectura, decisiones de diseño (ADRs), definición de APIs e infraestructura. | Diagramas C4/UML, documentos ADR, especificaciones OpenAPI. |
| **Build** | Desarrollo de modelos de IA, entrenamiento, creación de servicios backend, frontend e integración. | Código fuente, pipelines de entrenamiento, endpoints REST/gRPC. |
| **QA** | Pruebas unitarias, evaluación de métricas del modelo, validación de integración y seguridad. | Matriz de pruebas, reportes de evaluación ML, pruebas de carga. |
| **Deploy** | Contenedorización, configuración de pipelines CI/CD y despliegue en ambiente productivo/cloud. | Dockerfiles, YAMLs de CI/CD, endpoints desplegados en la nube. |
| **Risk** | Registro, seguimiento y mitigación de bloqueos, riesgos técnicos, éticos o de equipo. | Matriz de riesgos, tarjetas de bloqueo activo. |

---

## Campos Personalizados Obligatorios (Custom Fields)

Cada tarea creada en ClickUp debe completar de forma obligatoria los siguientes campos antes de pasar al estado *In Progress*:

1. **Sprint (Dropdown / Tag):** Identifica el Sprint actual de ejecución (ej. `Sprint 0`, `Sprint 1`).
2. **Dueño (Assignee):** Integrante directamente responsable de la ejecución y entrega de la tarea.
3. **Criterio de Aceptación (Text Area / Checklist):** Condición técnica y funcional clara que determina cuándo la tarea cumple lo esperado.
4. **Enlace a Evidencia (URL):** Link obligatorio a GitHub (commit, PR o archivo Markdown) que demuestra el trabajo realizado.
5. **Riesgo Asociado (Dropdown):** Nivel de riesgo implícito (`Bajo`, `Medio`, `Alto`, `Crítico`).
6. **Estado de Bloqueo (Dropdown / Label):** Indica si la tarea está expedita (`Sin Bloqueo`) o detenida (`Bloqueado`).

---

## Estados del Flujo de Trabajo

- **To Do:** Tarea definida con criterio de aceptación y dueño, lista para ser iniciada.
- **In Progress:** Tarea en desarrollo activo.
- **In Review / PR:** Tarea completada pendiente de revisión de código/documentación en GitHub.
- **Done:** Tarea verificada que cumple el Definition of Done (DoD) con evidencia enlazada.
- **Blocked:** Tarea pausada por un impedimento reportado en la lista *Risk*.

---

## Ejemplos de Tareas Iniciales (Sprint 0)

### Tarea 1: Elaboración del Team Charter v1
- **Lista:** Discovery
- **Sprint:** Sprint 0
- **Dueño:** Carla (Producto)
- **Criterio de Aceptación:** Archivo `team_charter.md` redactado con las 6 secciones obligatorias (integrantes, canales, PRs, bloqueos, reglas de IA y DoD), revisado y aprobado por todos los integrantes en el repo.
- **Enlace a Evidencia:** `https://github.com/equipo-tsi/proyecto-ia/blob/main/docs/team_charter.md`
- **Riesgo Asociado:** Medio (disponibilidad de integrantes no validada).

### Tarea 2: Matriz de Priorización de Casos
- **Lista:** Discovery
- **Sprint:** Sprint 0
- **Dueño:** Bruno (Ingeniería)
- **Criterio de Aceptación:** Comparación cuantitativa de 3 casos mediante escala 1-5 en 5 dimensiones, justificación de selección del caso ganador y redacción del Product Goal.
- **Enlace a Evidencia:** `https://github.com/equipo-tsi/proyecto-ia/blob/main/docs/priorizacion_casos.md`
- **Riesgo Asociado:** Bajo.

### Tarea 3: Configuración de la Estructura del Tablero ClickUp
- **Lista:** Discovery
- **Sprint:** Sprint 0
- **Dueño:** Ana (Datos)
- **Criterio de Aceptación:** Tablero creado con las 7 listas operativas, campos obligatorios configurados y vinculación con la organización de GitHub.
- **Enlace a Evidencia:** `https://github.com/equipo-tsi/proyecto-ia/blob/main/docs/clickup_estructura.md`
- **Riesgo Asociado:** Bajo.