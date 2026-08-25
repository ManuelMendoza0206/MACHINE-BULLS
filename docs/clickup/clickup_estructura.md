# Estructura y Operativa del Tablero ClickUp

## Listas del Espacio de Trabajo (Space)

El proyecto se organizará en ocho listas estándar para garantizar el flujo y la trazabilidad del trabajo según el ciclo de vida de desarrollo de IA:

| Lista | Uso típico / Propósito | Entregables y Evidencia asociada |
|---|---|---|
| **Discovery** | Definición de problema, usuarios, Product Goal, priorización | `team_charter.md`, `priorizacion_casos.md` |
| **Data** | Fuentes, permisos, limpieza, contratos, versionado | Datasets, scripts de ETL, data datasheets |
| **Architecture** | Diagramas, ADR, decisiones técnicas, riesgos | Diagramas de arquitectura, documentos ADR |
| **Build** | Desarrollo de modelos, backend, frontend e integración | Código fuente, endpoints API, modelos |
| **QA** | Pruebas unitarias, métricas de IA, integración y seguridad | Matriz de pruebas, reportes de evaluación |
| **Deploy** | Contenedorización, CI/CD, infraestructura cloud | Dockerfiles, scripts de despliegue |
| **Risk** | Bloqueos, amenazas, mitigaciones y seguimiento | Registro de bloqueos, matriz de mitigación |
| **Reportes / Evidencia** | Archivo Markdown versionado | Enlace a la evidencia en GitHub |

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