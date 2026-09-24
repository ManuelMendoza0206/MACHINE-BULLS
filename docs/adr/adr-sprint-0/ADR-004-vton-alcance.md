# ADR 004 — Alcance de VTON: módulo experimental académico

Estado: aceptado
Fecha: 2026-08-26

## Contexto

La prueba virtual requiere modelos generativos entrenados sobre pares de persona y prenda. Los checkpoints de referencia como IDM-VTON y OOTDiffusion se distribuyen con licencia no comercial y su inferencia exige GPU dedicada.

## Decision

Declaramos VTON como módulo experimental de investigación, aislado del flujo principal. El Product Goal evaluable es el motor de recomendación y compatibilidad. VTON se sirve mediante un proveedor de inferencia externo bajo uso académico, con el código separado y etiquetado como no comercial.

## Alternativas

Entrenar un modelo VTON desde cero queda descartado por falta de dataset pareado y presupuesto de cómputo dentro del semestre. Comprometer VTON como función comercial queda descartado porque introduce riesgo legal y de costo que puede bloquear la entrega del resto del sistema.

## Consecuencias

El núcleo del proyecto se puede evaluar aunque VTON no esté disponible. Si la licencia o el costo invalidan el módulo, se desconecta y la plataforma sigue operativa como asistente de guardarropa y compatibilidad por composición en tablero. El riesgo de uso sobre fotos reales se traslada a consentimiento y retención, no a licenciamiento comercial.

