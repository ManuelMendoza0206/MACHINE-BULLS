"""Router de Smart Shopping ("Before You Buy") y Clima.

Endpoints:
- POST /api/v1/shopping/evaluate : Evalua una prenda de tienda antes de comprarla.
- POST /api/v1/shopping/{garment_id}/adopt : Adopta la prenda candidata al closet.
- GET  /api/v1/shopping/weather : Obtiene contexto climatico actual.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, UploadFile
from sqlalchemy.orm import Session

from db.session import get_session
from domain.models import User
from domain.schemas import SmartShoppingEvaluateResponse, WeatherResponse
from services.auth import get_current_user
from services.image_upload import read_validated_image
from services.shopping.evaluator import adopt_candidate_garment, evaluate_prospective_garment
from services.weather import get_weather

router = APIRouter(prefix="/api/v1/shopping", tags=["shopping"])

SessionDep = Annotated[Session, Depends(get_session)]
UserDep = Annotated[User, Depends(get_current_user)]


@router.post("/evaluate", response_model=SmartShoppingEvaluateResponse)
def evaluate_candidate(
    file: UploadFile,
    session: SessionDep,
    user: UserDep,
) -> SmartShoppingEvaluateResponse:
    """Evalua una prenda de tienda para determinar redundancia y compatibilidad con el closet."""
    content, _image = read_validated_image(file, "archivo")

    return evaluate_prospective_garment(session, user.id, content)


@router.post("/{garment_id}/adopt")
def adopt_candidate(
    garment_id: str,
    session: SessionDep,
    user: UserDep,
) -> dict:
    """Transfiere la prenda candidata al guardarropa definitivo del usuario tras comprarla."""
    adopt_candidate_garment(session, user.id, garment_id)
    return {"status": "adopted", "garment_id": garment_id}


@router.get("/weather", response_model=WeatherResponse)
def fetch_current_weather(
    city: str | None = Query(None, description="Ciudad para consultar el clima"),
    lat: float | None = Query(None, ge=-90, le=90, description="Latitud GPS opcional"),
    lon: float | None = Query(None, ge=-180, le=180, description="Longitud GPS opcional"),
) -> WeatherResponse:
    """Obtiene el clima actual para contextualizar las recomendaciones."""
    effective_city = city if (city is not None or (lat is not None and lon is not None)) else "La Paz"
    data = get_weather(city=effective_city, lat=lat, lon=lon)
    return WeatherResponse(**data)
