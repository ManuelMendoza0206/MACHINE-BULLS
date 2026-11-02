## ADDED Requirements

### Requirement: Alt text generado desde metadata real en outfits
Toda imagen/collage de `OutfitCard` y el detalle de `/outfits/[outfitId]` SHALL tener un `alt` no vacío derivado de la estética y las prendas componentes del outfit, nunca `alt=""`.

#### Scenario: OutfitCard en el grid de recomendaciones
- **WHEN** `OutfitCard` renderiza un outfit con estética y prendas conocidas
- **THEN** el `alt` describe el outfit (ej. "Outfit estética old_money: camisa, pantalón, calzado"), verificado por un test de integración dedicado

### Requirement: Animaciones del grid respetan `prefers-reduced-motion`
Las transiciones de entrada de `OutfitCard` (skeleton → resultado) y cualquier animación de la navegación por teclado del grid SHALL respetar `prefers-reduced-motion`.

#### Scenario: Usuario con reduced motion activado
- **WHEN** `prefers-reduced-motion: reduce` está activo
- **THEN** el grid de outfits pasa de skeleton a resultado sin animación de transición, manteniendo el mismo contenido informativo, verificado por un test de integración
