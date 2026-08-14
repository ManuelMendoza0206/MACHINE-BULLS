# Team Charter

## Integrantes y disponibilidad

| Integrante | Responsabilidad | Disponibilidad | Restricción | Riesgo personal declarado |
|---|---|---|---|---|
| Manuel Jiménez | Product Owner | Lun-Dom 19:00 - 23:00 | *Por definir* | *Por definir* |
| Leonardo Ibarra | Scrum Master | Lun-Dom 19:00 - 23:00 | *Por definir* | *Por definir* |
| Huascar Durán | Development Team | Lun-Dom 19:00 - 23:00 | *Por definir* | *Por definir* |
| Jaicel Velasco | Development Team | Lun-Dom 19:00 - 23:00 | *Por definir* | *Por definir* |

---

## Canales y tiempos de respuesta

- **ClickUp:** Gestión de tareas, asignación de responsables, estado del backlog y enlaces obligatorios a evidencia.
- **GitHub Issues & PRs:** Reporte de defectos técnicos, bloqueos reproducibles, discusión de código y revisión de pares.
- **WhatsApp:** Comunicación rápida y coordinación operativa diaria. **Regla:** No se toman ni aprueban decisiones finales por este medio.
- **Tiempo de respuesta normal:** Máximo 24 horas en días laborables.
- **Bloqueo crítico:** Se etiqueta la tarea como `Bloqueado` en ClickUp y se notifica inmediatamente con la etiqueta `@canal` en WhatsApp.

> **Regla de evidencia:** Toda decisión que afecte el alcance, los datos, la arquitectura o la evaluación debe quedar registrada en ClickUp o GitHub. Si no está registrada, no es parte del avance del equipo.

---

## Revisión de Pull Requests (PR)

- **Protección de rama principal:** Queda estrictamente prohibido realizar commits directos a la rama `main`. Todo cambio se integra mediante Pull Requests.
- **Estructura mínima de un PR:**
  - Objetivo claro del cambio.
  - Lista de archivos modificados.
  - Pruebas o verificaciones ejecutadas.
  - Enlace a la tarea correspondiente en ClickUp y evidencia adjunta.
  - Declaración del uso de herramientas de IA asistida.
- **Aprobación requerida:** Todo PR debe ser revisado y aprobado por al menos 1 integrante antes de realizar el merge.
- **Criterios de rechazo inmediato:**
  - Inclusión de llaves API, credenciales, tokens o datos personales sensibles.
  - Pruebas unitarias o de integración fallidas.
  - Falta de documentación o criterios de aceptación incompletos.

---

## Manejo de bloqueos

Cualquier impedimento que detenga el avance por más de 12 horas debe estructurarse y reportarse bajo el siguiente formato:

- **Descripción del bloqueo:** Qué impide avanzar.
- **Fecha y hora de inicio:** Momento en que se detectó.
- **Impacto:** Qué tarea, hito o entrega está en riesgo.
- **Intentos de solución:** Qué soluciones se han probado previamente.
- **Acción requerida:** Qué ayuda o decisión específica se necesita del equipo o docente.

---

## Reglas de integridad y uso de IA

- **Herramientas permitidas:** Se autoriza el uso de asistentes de IA (Gemini, ChatGPT, Copilot) para análisis, diseño de arquitectura, generación de código base, pruebas y redacción de documentación.
- **Restricción de confidencialidad:** Queda estrictamente prohibido ingresar credenciales, claves de API, secretos de infraestructura o datos personales sensibles en prompts de herramientas de IA.
- **Verificación obligatoria:** Todo código, arquitectura o documentación generada por IA debe ser probado, comprendido y validado técnicamente por el responsable asignado.
- **Declaración explícita:** En la descripción del PR se debe declarar qué porcentaje/sección fue asistida por IA y qué pruebas se ejecutaron para garantizar su validez.
- **Responsabilidad:** La IA es una herramienta de soporte; la responsabilidad técnica y académica del entregable recae 100% en el equipo.

---

## Definition of Done (DoD) inicial

Una tarea o incremento del proyecto se considera oficialmente **Terminada** únicamente cuando cumple con los siguientes criterios:

1. **Criterios de aceptación:** Todos los criterios definidos en la tarea de ClickUp han sido verificados y cumplidos.
2. **Revisión e integración:** El código o documentación está integrado en la rama `main` de GitHub mediante un PR aprobado por al menos un par.
3. **Calidad y seguridad:** Se ha comprobado la ausencia de credenciales, secretos o datos personales no autorizados.
4. **Verificación técnica:** Si la tarea involucra código, las pruebas ejecutan exitosamente (o se justifica explícitamente por qué no aplican).
5. **Transparencia de IA:** Se ha declarado el uso de herramientas de IA y su correspondiente proceso de validación.
6. **Evidencia trazable:** Existe un enlace directo a la evidencia (commit, PR o documento en GitHub) dentro de la tarjeta de ClickUp.