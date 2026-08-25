## ADDED Requirements

### Requirement: Ruta preferida de reconciliación de identidad
El gap de reconciliación `auth.users` (Supabase) ↔ `User` (backend) descrito en spec 06 §6 SHALL resolverse, salvo decisión explícita en contrario del equipo backend, mediante un trigger de base de datos sobre `auth.users` (`AFTER INSERT`), no mediante un endpoint HTTP de sincronización invocado por el frontend.

#### Scenario: Ambas opciones siguen siendo técnicamente swappable
- **WHEN** el equipo backend decide implementar la alternativa de endpoint (`POST /api/v1/users/sync`) en vez del trigger
- **THEN** ese cambio no requiere modificar `AuthForm` — la reconciliación permanece aislada dentro de `signUpWithEmail` (spec 06 §2.4), tal como ya exige el criterio de aceptación existente

**Justificación de la preferencia:** ambos sistemas comparten el mismo Postgres (`base-plan.md` §6.1), por lo que un trigger de base de datos elimina una clase entera de fallos (reintentos de red, orden de operaciones, fallos parciales de un endpoint adicional) que un mecanismo HTTP no elimina — ver auditoría de arquitectura, hallazgo P1 "Reconciliación de identidad sin mecanismo definido".
