# Política de Privacidad, Consentimiento y Retención de Fotografías

**Documento:** POL-SEC-001  
**Versión:** 1.0.0  
**Fecha de Ratificación:** 2026-11-06  
**Responsable de Gobernanza:** Jaicel Velasco (Persona 2 / Machine Bulls)  
**Alcance:** Servicios de Ingesta de Armario (`/wardrobe`) y Pipeline de Prueba Virtual (`/try-on` VTON).  
**Referencias Normativas:** `.speckit/constitution.md` §6, `docs/risks/RISK-REGISTER.md` R05/R07, ADR-303.

---

## 1. Declaración de Principios

StyleMe procesa imágenes fotográficas subidas por los usuarios bajo principios estrictos de minimización de datos, limitación de finalidad y transparencia algorítmica:

1. **Minimización y Proporcionalidad**: Solo se recopilan las imágenes estrictamente indispensables para la visualización del armario y la inferencia de prueba virtual sobre la silueta del usuario.
2. **Limitación de Finalidad**: Las imágenes del usuario **nunca** se emplean para el entrenamiento, fine-tuning ni enriquecimiento de modelos fundacionales de inteligencia artificial (generativos o discriminativos) sin el consentimiento explícito y separado del titular.
3. **Procesamiento Efímero**: Las fotografías corporales completas se consideran datos sensibles (biometría de silueta/pose) y están sujetas a un ciclo de vida estrictamente efímero con eliminación automática a las 24 horas.

---

## 2. Clasificación de Imágenes y Ciclo de Retención

| Categoría de Imagen | Finalidad | Almacenamiento | Periodo de Retención | Política de Eliminación |
| :--- | :--- | :--- | :--- | :--- |
| **Prendas de Guardarropa** (`garments/`) | Digitalización y armado de outfits. | Azure Blob Storage (contenedor `styleme`, carpeta privada del usuario). | Mientras la prenda permanezca en el armario del usuario. | Inmediata tras la eliminación manual de la prenda por el usuario (`DELETE /api/v1/garments/{id}`). |
| **Fotografías Corporales de Usuario** (`vton/user_photos/`) | Detección de pose (MediaPipe A-Pose) e inferencia VTON. | Azure Blob Storage (contenedor `styleme`, carpeta aislada temporal). | **24 horas máximo**. | Purgado automático mediante política de ciclo de vida (Blob Lifecycle Policy) o purgado programado del worker. |
| **Resultados de Prueba Virtual** (`vton/results/`) | Muestra del resultado de combinación aplicada a la silueta. | Azure Blob Storage (contenedor `styleme`). | Asociado a la sesión o historial del usuario. | Eliminable bajo demanda por el usuario desde la vista `/try-on/history`. |

---

## 3. Mecanismo de Consentimiento Informado (Consent Gate)

El consentimiento del usuario se captura en dos niveles dentro de la aplicación cliente:

1. **Consentimiento para Prendas (`PhotoConsentGate variant="garments"`)**:
   - Se muestra previo a la primera subida de prendas al armario cápsula.
   - Informa sobre la extracción de metadatos (categoría, color, estética) y el recorte automático de fondo (`rembg`).
2. **Consentimiento Biométrico VTON (`PhotoConsentGate variant="vton"`)**:
   - Se exige de forma obligatoria antes de habilitar el selector de foto corporal en el Probador Virtual.
   - Especifica que la imagen se utiliza exclusivamente para inferencia en tiempo de ejecución.
   - Comunica de forma destacada la eliminación automática a las **24 horas** y la garantía de **cero reentrenamiento**.
   - Se persiste localmente tras la aceptación, permitiendo la revocación en cualquier momento limpiando los datos del navegador o cerrando la sesión.

---

## 4. Seguridad en Almacenamiento y Transmisión

1. **Tránsito Cifrado**: Todas las transferencias de imágenes hacia y desde la API se realizan bajo HTTPS/TLS 1.3 con certificados gestionados.
2. **Acceso Restringido mediante Firmas**: Las imágenes privadas no son públicas; se accede a ellas exclusivamente mediante Shared Access Signatures (SAS) de Azure Blob Storage de corta duración (TTL ≤ 60 minutos).
3. **Aislamiento Multi-inquilino**: La estructura de rutas en el contenedor vincula cada recurso al `user_id` autenticado mediante el JWT emitido por Supabase Auth, previniendo referencias directas inseguras a objetos (IDOR).

---

## 5. Derecho al Olvido y Cancelación

El usuario conserva en todo momento el control sobre su información visual:
- **Borrado Selectivo**: Al eliminar una prenda, el backend borra el registro en la base de datos relacional y despacha la eliminación física del blob asociado en Azure.
- **Borrado de Historial**: El endpoint de historial permite al usuario purgar pruebas anteriores y eliminar las imágenes renderizadas correspondientes.
- **Cierre de Cuenta**: La baja del usuario en el sistema dispara la eliminación en cascada de todas las prendas registradas (`GarmentOwnership`) y de sus archivos en almacenamiento.
