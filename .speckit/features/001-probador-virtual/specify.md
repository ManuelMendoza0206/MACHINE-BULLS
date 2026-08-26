# Feature 001: Probador Virtual

> **Nota de vigencia (2026-08-24):** las user stories, requisitos funcionales y edge cases de este documento siguen vigentes y son agnósticos de plataforma. Su companion técnico original, `plan.md` (React Native + AWS), quedó **superseded** por la decisión actual de plataforma (Next.js web + Supabase) — ver la nota en ese archivo y `openspec/specs/frontend/vton-flow/spec.md` para el diseño vigente de este flujo.

## Resumen

Permitir que un usuario suba su armario (prendas propias o del catálogo del comercio) y una foto suya, y visualizar cómo le quedarían prendas específicas que él mismo elige — sin necesidad de probárselas físicamente.

Esta feature es independiente del **Feature 002: Recomendador Automático de Estilos** (que se especificará por separado), aunque ambas comparten el mismo repositorio de prendas subidas por el usuario.

## Por qué (Product Goal vinculado)

Reducir la incertidumbre de talla/estilo al comprar ropa online, disminuyendo devoluciones y aumentando conversión — sin depender de que el usuario tenga las prendas físicamente para combinarlas.

## User Stories

1. **Como comprador**, quiero subir fotos de las prendas que tengo o que veo en el catálogo, para tener un "armario digital" sobre el que trabajar.
2. **Como comprador**, quiero subir una foto mía (de cuerpo, con buena iluminación), para que el sistema la use como base de la visualización.
3. **Como comprador**, quiero elegir una o varias prendas de mi armario digital y ver una imagen generada de cómo se verían puestas sobre mí, para decidir si comprarlas o combinarlas.
4. **Como comprador**, quiero poder repetir la generación con distintas combinaciones de prendas sin tener que volver a subir mi foto cada vez.
5. **Como comercio**, quiero que las prendas de mi catálogo estén disponibles como opciones de armario para mis clientes, para que puedan probárselas virtualmente antes de comprar.

## Requisitos Funcionales

- **FR-001**: El sistema debe permitir subir múltiples imágenes de prendas (armario) asociadas a un usuario.
- **FR-002**: El sistema debe permitir subir una foto de cuerpo del usuario como "foto base" para la generación.
- **FR-003**: El sistema debe permitir seleccionar una o más prendas del armario digital para generar la visualización.
- **FR-004**: El sistema debe generar una imagen realista de la foto base del usuario con la(s) prenda(s) seleccionada(s) superpuesta(s)/ajustada(s) al cuerpo (try-on generativo).
- **FR-005**: El sistema debe permitir volver a generar con otra combinación de prendas reutilizando la misma foto base ya subida.
- **FR-006**: El sistema debe indicar cuando una generación falla o produce baja calidad (ej. distorsión evidente), en vez de mostrar un resultado silenciosamente defectuoso.
- **FR-007**: El sistema debe distinguir entre prendas subidas por el propio usuario y prendas provenientes del catálogo del comercio.

## Fuera de Alcance (para esta feature)

- Recomendación automática de combinaciones/estilos (es el Feature 002).
- Compra o checkout dentro del flujo de prueba virtual.
- Soporte para video o prueba en tiempo real (solo imágenes estáticas).
- Ajuste de talla real (medidas corporales) — el try-on es visual, no un sistema de tallaje.

## Success Criteria

- **SC-001**: Un usuario puede completar el flujo (subir armario → subir foto → seleccionar prenda → ver resultado) sin asistencia.
- **SC-002**: El tiempo de generación de una imagen try-on es aceptable para no interrumpir el flujo de compra (a definir umbral concreto en `/speckit.plan` según restricciones de GPU/costo).
- **SC-003**: La imagen generada es reconocible como "el usuario con la prenda puesta" — sin distorsiones graves de cuerpo o tela — en la mayoría de los casos evaluados manualmente por el equipo.
- **SC-004**: El usuario puede generar múltiples combinaciones sin volver a subir su foto base.

## Edge Cases

- Foto base de mala calidad (poca luz, ángulo raro, cuerpo parcialmente cubierto): el sistema debe advertir en vez de generar un resultado pobre sin aviso.
- Prenda subida que no es ropa (foto irrelevante o corrupta): el sistema debe poder rechazarla o marcarla como inválida.
- Usuario sin prendas aún en su armario intentando generar un try-on: el sistema debe guiarlo a subir prendas primero.
- Selección de prendas incompatibles entre sí (ej. dos pantalones a la vez): definir si el sistema limita la selección por tipo de prenda o permite el error y lo maneja en el resultado.
- Fotos de usuario con datos sensibles (menores de edad, rostro identificable): revisar contra el principio de privacidad de la Constitution — requiere política de retención/consentimiento antes de procesar.
