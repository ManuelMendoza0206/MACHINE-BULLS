#!/usr/bin/env python3
"""
MLflow server + ngrok tunnel

Uso:
  uv run python backend/scripts/mlflow_ngrok.py
  # o
  uv run --project backend python backend/scripts/mlflow_ngrok.py
"""
from __future__ import annotations
import os
import sys
import time
import signal
import subprocess
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR.mkdir(parents=True, exist_ok=True)
os.chdir(BACKEND_DIR)

MLFLOW_PORT = int(os.getenv("MLFLOW_PORT", "5000"))
MLFLOW_DB = BACKEND_DIR / "mlflow.db"
ARTIFACT_ROOT = BACKEND_DIR / "mlartifacts"
ARTIFACT_ROOT.mkdir(exist_ok=True)

def main() -> int:
    # Verificar uv/mlflow
    try:
        from pyngrok import ngrok, conf  # type: ignore
    except ImportError:
        print("[ERR] pyngrok no instalado. Ejecuta: uv add --project backend pyngrok", file=sys.stderr)
        return 1

    # Authtoken: usa el global ya configurado (~/.config/ngrok/ngrok.yml).
    # Si NGROK_AUTHTOKEN está en env, lo sobreescribe.
    authtoken = os.getenv("NGROK_AUTHTOKEN")
    if authtoken:
        conf.get_default().auth_token = authtoken
        print(f"> NGROK_AUTHTOKEN tomado de env (len={len(authtoken)})")
    else:
        # pyngrok lee automáticamente ~/.config/ngrok/ngrok.yml
        print("> Usando authtoken global de ~/.config/ngrok/ngrok.yml")

    # Iniciar MLflow server — pin a tu dominio ngrok fijo (2 años estable)
    mlflow_cmd = [
        sys.executable, "-m", "mlflow", "server",
        "--backend-store-uri", f"sqlite:///{MLFLOW_DB}",
        "--default-artifact-root", str(ARTIFACT_ROOT),
        "--host", "0.0.0.0",
        "--port", str(MLFLOW_PORT),
        "--allowed-hosts", "humorous-trusting-domelike.ngrok-free.dev,127.0.0.1,localhost,127.0.0.1:5000,localhost:5000",
        "--cors-allowed-origins", "https://humorous-trusting-domelike.ngrok-free.dev",
    ]
    print(f"> Iniciando MLflow server en 0.0.0.0:{MLFLOW_PORT}")
    print(f"  DB: {MLFLOW_DB}")
    print(f"  Artifacts: {ARTIFACT_ROOT}")
    mlflow_proc = subprocess.Popen(mlflow_cmd)
    time.sleep(3)
    if mlflow_proc.poll() is not None:
        print("[ERR] MLflow server falló al iniciar", file=sys.stderr)
        return 1
    print("[OK] MLflow server PID:", mlflow_proc.pid)

    # Abrir túnel ngrok
    try:
        public_url = ngrok.connect(MLFLOW_PORT, "http")
        # pyngrok retorna objeto con public_url attr
        url_str = getattr(public_url, "public_url", str(public_url))
        print("\n" + "="*60)
        print(f"[OK] MLflow público en: {url_str}")
        print(f"   Pon esto en Colab:")
        print(f'   import mlflow; mlflow.set_tracking_uri("{url_str}")')
        print(f"   o export MLFLOW_TRACKING_URI={url_str}")
        print(f"   UI local: http://127.0.0.1:{MLFLOW_PORT}")
        print("="*60 + "\n")
        print("Presiona Ctrl+C para detener...")
    except Exception as e:
        print(f"[ERR] Error al abrir túnel ngrok: {e}", file=sys.stderr)
        mlflow_proc.terminate()
        return 1

    def shutdown(signum, frame):
        print("\n> Cerrando...")
        try:
            ngrok.disconnect(url_str)
        except Exception:
            pass
        try:
            ngrok.kill()
        except Exception:
            pass
        mlflow_proc.terminate()
        try:
            mlflow_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            mlflow_proc.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    try:
        mlflow_proc.wait()
    except KeyboardInterrupt:
        shutdown(None, None)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
