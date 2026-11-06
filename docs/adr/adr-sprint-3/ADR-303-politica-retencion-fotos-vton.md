# ADR 303 — Ratificación de Política de Consentimiento y Retención Efímera de Fotos VTON

Estado: aceptado (reemplaza y cierra la deuda técnica de ADR-301)  
Fecha: 2026-11-06  
Autor: Jaicel Velasco (Persona 2 / Machine Bulls)  
Tareas asociadas: `86e302a6g`, `86e301dzc` (Risk / Sprint 3)  

---

## Contexto

En el Sprint 3, la ADR-301 documentó un gate de consentimiento temporal (*placeholder*) implementado para no bloquear el flujo de subida de prendas de Huascar, declarando una deuda técnica explícita: el diseño definitivo de la política de consentimiento y retención de imágenes personales (Q5) debía ser formalizado con respaldo legal y técnico antes de habilitar el probador virtual VTON.

Con la integración del pipeline VTON asíncrono (CatVTON / Replicate) en los Sprints 4-5 y la necesidad de procesar fotos de cuerpo entero de usuarios reales, era imperativo cerrar el riesgo alto abierto en `.speckit/constitution.md` §6 y en `docs/risks/RISK-REGISTER.md` (R05/R07).

---

## Decisión

1. **Ratificación de Política Efímera (POL-SEC-001)**:
   - Las fotografías corporales de usuario empleadas en `/try-on` tienen un ciclo de vida estrictamente limitado a un máximo de **24 horas**.
   - Tras 24 horas, las fotos temporales son purgadas de Azure Blob Storage.
   - Queda terminantemente prohibido utilizar fotografías personales de usuarios para el reentrenamiento o fine-tuning de modelos generativos o de clasificación sin un consentimiento por escrito explícito.
2. **Consentimiento Informado Diferenciado en Cliente**:
   - `PhotoConsentGate` soporta variantes especializadas (`variant="vton"` vs `variant="garments"`).
   - Para VTON, la interfaz despliega una advertencia prominente de privacidad biométrica detallando:
     - Detección de pose mediante MediaPipe.
     - Retención máxima de 24 horas.
     - Cláusula de cero reentrenamiento.
     - Derecho de eliminación manual inmediata.
3. **Persistencia y Control**:
   - La concesión del consentimiento se persiste en `photo-consent-store` del navegador y es revocable.
   - En el backend, las fotos se aíslan por `user_id` asegurando que ningún usuario pueda acceder a fotos de otros usuarios.

---

## Alternativas Descartadas

- **Conservar fotos indefinidamente para re-intentos de VTON**: Descartada por violar principios de minimización de datos (GDPR / compliance) y elevar el riesgo ante filtraciones.
- **Mantener el placeholder genérico de ADR-301**: Descartada porque no informaba sobre análisis biométrico de pose ni ofrecía garantías temporales de retención.

---

## Consecuencias

- **Positivas**: Se cierra formalmente el riesgo alto de privacidad (R07) y la deuda técnica declarada en ADR-301. El producto cuenta con un blindaje legal y ético claro antes de demostraciones públicas.
- **Compromiso Operativo**: El backend y las políticas de Azure Blob Storage deben mantener habilitadas las reglas de expiración a 24 horas para la carpeta de imágenes temporales de inferencia.
