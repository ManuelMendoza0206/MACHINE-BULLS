"""Script de prueba para registrar métricas en el MLflow remoto de DagsHub."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

# Cargar variables de backend/.env si existe
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)

import dagshub
import mlflow


def main() -> None:
    print("Conectando con DagsHub MLflow...")
    # Si DAGSHUB_USER_TOKEN está en backend/.env, dagshub lo toma automáticamente.
    dagshub.init(
        repo_owner="JesusRodrigoV",
        repo_name="machine-bulls",
        mlflow=True,
    )

    print("Registrando corrida de prueba en DagsHub...")
    with mlflow.start_run(run_name="prueba-conexion-dagshub"):
        mlflow.log_param("entorno", "local-dev")
        mlflow.log_param("modelo_clip", "patrickjohncyh/fashion-clip")
        mlflow.log_metric("accuracy_val", 0.945)
        mlflow.log_metric("latency_ms", 12.3)

    print("¡Corrida registrada exitosamente!")
    print("Puedes verla en: https://dagshub.com/JesusRodrigoV/machine-bulls/experiments")


if __name__ == "__main__":
    main()
