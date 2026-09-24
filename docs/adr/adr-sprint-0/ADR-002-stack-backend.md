# ADR 002 — Stack backend: FastAPI con Python

Estado: aceptado
Fecha: 2026-08-26

## Contexto

El backend expone análisis de prenda, recomendación de outfits y prueba virtual. Estas operaciones usan PyTorch, Hugging Face Transformers, OpenCV y MediaPipe, y dos de ellas superan los 10 segundos de cómputo.

## Decision

Usamos FastAPI con Python 3.11, validación con Pydantic v2 y SQLAlchemy 2.0 en modo asíncrono sobre PostgreSQL.

## Alternativas

Express con Node queda descartado. El ecosistema de visión por computadora está en Python y con Node habría que crear un microservicio adicional para ejecutar los scripts de inferencia, lo que añade serialización y latencia sin beneficio. Django queda descartado por incluir administración, ORM y plantillas que no necesitamos para una API de inferencia.

## Consecuencias

La API genera su esquema OpenAPI de forma automática, lo que permite mantener los schemas de Zod del frontend alineados. Todo endpoint que toca GPU o red externa se implementa como async def para no bloquear el event loop durante los tiempos de VTON.

