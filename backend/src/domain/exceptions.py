"""Jerarquia de excepciones de dominio para StyleMe.

Conforme a openspec/specs/backend/api-gateway/spec.md §2.2:
- DataValidationError -> 422
- ResourceNotFoundError -> 404
- ModelInferenceError -> 500
- VTONJobTimeoutError -> Tratado como status: failed en 200 de negocio
"""

from __future__ import annotations


class StyleMeException(Exception):
    """Excepcion base para errores del dominio StyleMe."""

    def __init__(self, message: str = "") -> None:
        super().__init__(message)
        self.message = message


class DataValidationError(StyleMeException):
    """Error de validacion semantica o de formato en datos de entrada."""


class ResourceNotFoundError(StyleMeException):
    """Recurso solicitado (prenda, usuario, outfit, job) no encontrado."""


class ModelInferenceError(StyleMeException):
    """Error durante la inferencia de modelos ML (CLIP, remocion de fondo, etc.)."""


class VTONJobTimeoutError(StyleMeException):
    """Timeout alcanzado durante la ejecucion de la prueba virtual."""


EXCEPTION_STATUS_MAP = {
    DataValidationError: 422,
    ResourceNotFoundError: 404,
    ModelInferenceError: 500,
}
