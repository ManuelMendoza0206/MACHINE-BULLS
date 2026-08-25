## ADDED Requirements

### Requirement: Protección contra doble-submit en la creación de VTONJob
El CTA "Generar prueba virtual" SHALL deshabilitarse mientras `useCreateVtonJob().status === 'pending'`, evitando disparar dos `POST /vton/try-on` concurrentes para la misma foto/outfit por doble click del usuario.

#### Scenario: Doble click en el CTA de generación
- **WHEN** el usuario hace doble click sobre "Generar prueba virtual" antes de que la primera solicitud resuelva
- **THEN** solo se ejecuta una mutación `createVtonJob`, verificado por un test de integración que cuenta las llamadas MSW al endpoint (aserción de contador = 1), replicando el mismo estándar ya exigido para `AuthForm` en `specs/06-landing-and-auth-flow`

**Justificación:** `POST /vton/try-on` es la mutación de mayor costo del sistema (inferencia GPU, `base-plan.md` §8) — debe recibir como mínimo la misma protección que ya es obligatoria para signup/login.

### Requirement: Alt text en las vistas de resultado y comparación VTON
`VtonResultView` SHALL exponer un `alt` descriptivo tanto para la foto original como para el resultado generado (ej. "Foto original del usuario" / "Resultado con el outfit {estética} aplicado"), nunca `alt=""`, dado que es la pantalla de mayor peso visual del producto.

#### Scenario: Slider before/after renderizado
- **WHEN** `VtonResultView` monta con `originalPhotoUrl` y `resultUrl` resueltos
- **THEN** ambas imágenes exponen `alt` no vacío y distinguible entre sí, verificado por un test de integración

### Requirement: Animaciones de progreso VTON respetan `prefers-reduced-motion`
La animación/ilustración de `VtonProgressView` (Etapa 2, spec 04 §2.5) SHALL respetar `prefers-reduced-motion`, cayendo a la barra de progreso indeterminada con el mismo texto dinámico por fase, sin la animación decorativa.

#### Scenario: Usuario con reduced motion activado durante el polling
- **WHEN** `prefers-reduced-motion: reduce` está activo mientras `VtonProgressView` está montado
- **THEN** el componente omite la animación/ilustración decorativa mencionada en frontend-plan.md §3.4 y conserva únicamente `Progress` (spec 00 §2.4) con `aria-valuetext` y el texto de fase, verificado por un test de integración
