#!/usr/bin/env python3
"""
MLflow server + ngrok tunnel (Windows Compatible)

Uso:
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
    try:
        from pyngrok import ngrok, conf  # type: ignore
    except ImportError:
        print("[ERR] pyngrok no instalado. Ejecuta: uv add --project backend pyngrok", file=sys.stderr)
        return 1

    authtoken = os.getenv("NGROK_AUTHTOKEN")
    if authtoken:
        conf.get_default().auth_token = authtoken
        print(f"> NGROK_AUTHTOKEN tomado de env (len={len(authtoken)})")
    else:
        print("> Usando authtoken global de ~/.config/ngrok/ngrok.yml")

    # Servidor MLflow configurado con 1 solo worker para evitar WinError 10022 en Windows
    mlflow_cmd = [
        sys.executable, "-m", "mlflow", "server",
        "--backend-store-uri", f"sqlite:///{MLFLOW_DB}",
        "--default-artifact-root", str(ARTIFACT_ROOT),
        "--host", "127.0.0.1",
        "--port", str(MLFLOW_PORT),
        "--workers", "1",
    ]
    
    print(f"> Iniciando MLflow server en 127.0.0.1:{MLFLOW_PORT}")
    mlflow_proc = subprocess.Popen(mlflow_cmd)
    
    url_str = None

    def shutdown(signum=None, frame=None):
        print("\n> Cerrando...")
        if url_str:
            try:
                ngrok.disconnect(url_str)
            except Exception:
                pass
        try:
            ngrok.kill()
        except Exception:
            pass
        
        if mlflow_proc.poll() is None:
            mlflow_proc.terminate()
            try:
                mlflow_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                mlflow_proc.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    time.sleep(3)
    if mlflow_proc.poll() is not None:
        print("[ERR] MLflow server falló al iniciar", file=sys.stderr)
        return 1
    print("[OK] MLflow server PID:", mlflow_proc.pid)

    try:
        # ngrok genera automáticamente una URL válida para tu cuenta
        public_url = ngrok.connect(MLFLOW_PORT, "http")
        url_str = getattr(public_url, "public_url", str(public_url))
        
        print("\n" + "="*60)
        print(f"[OK] MLflow público en: {url_str}")
        print(f"   Pon esto en Colab:")
        print(f'   import mlflow; mlflow.set_tracking_uri("{url_str}")')
        print(f"   UI local: http://127.0.0.1:{MLFLOW_PORT}")
        print("="*60 + "\n")
        print("Presiona Ctrl+C para detener...")
        
        mlflow_proc.wait()
        
    except Exception as e:
        print(f"[ERR] Error inesperado: {e}", file=sys.stderr)
        shutdown()
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())