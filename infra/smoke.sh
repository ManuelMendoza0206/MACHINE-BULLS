#!/usr/bin/env bash
# Smoke end-to-end del stack para la demo:
#
#   ./infra/smoke.sh
#
# Verifica por contenedores: health (proveedor VTON) -> identidad /me -> upload
# de prendas con CLIP real -> recommend -> protocolo de entrada A-Pose (422 en
# la foto marginal, acepta la canonica) -> job VTON MULTICAPA desde el outfit
# recomendado -> resultado -> frontend sirviendo en :3000.
#
# Con VTON_PROVIDER=catvton el job corre 3 capas x ~50s en el GPU del host:
# el poll pide hasta 5 minutos. Sale con codigo != 0 en el primer fallo.
set -euo pipefail

API="${API:-http://localhost:8000}"
WEB="${WEB:-http://localhost:3000}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SAMPLES="$ROOT/sample_data"

json_get() { # json_get <json> <clave[.subclave]>
  python3 -c '
import json, sys
obj = json.loads(sys.argv[1])
for part in sys.argv[2].split("."):
    obj = obj[part]
print(obj)
' "$1" "$2"
}

step() { printf "\n== %s ==\n" "$1"; }

step "1/7 health"
HEALTH="$(curl -sf "$API/health")"
echo "$HEALTH"
test "$(json_get "$HEALTH" status)" = "ok"
PROVIDER="$(json_get "$HEALTH" vton_provider)"
echo "proveedor VTON: $PROVIDER"

step "2/7 identidad /me"
ME="$(curl -sf "$API/api/v1/me")"
USER_ID="$(json_get "$ME" user_id)"
echo "user_id: $USER_ID"

step "3/7 uploads (CLIP local)"
G1="$(curl -sf -F "file=@$SAMPLES/prenda_camiseta.jpg" "$API/api/v1/garments/upload")"
G2="$(curl -sf -F "file=@$SAMPLES/prenda_pantalon.jpg" "$API/api/v1/garments/upload")"
G3="$(curl -sf -F "file=@$SAMPLES/prenda_chaqueta.jpg" "$API/api/v1/garments/upload")"
echo "camiseta -> $(json_get "$G1" category) | pantalon -> $(json_get "$G2" category) | chaqueta -> $(json_get "$G3" category)"

step "4/7 recommend"
REC="$(curl -sf -H 'Content-Type: application/json' \
  -d "{\"user_id\": \"$USER_ID\"}" "$API/api/v1/outfits/recommend")"
OUTFIT_ID="$(python3 -c 'import json,sys; d=json.load(sys.stdin); o=d["outfits"][0]; print(o["outfit_id"], len(o["garments"]))' <<<"$REC")"
CAPAS="$(echo "$OUTFIT_ID" | awk '{print $2}')"
OUTFIT_ID="$(echo "$OUTFIT_ID" | awk '{print $1}')"
echo "outfit: $OUTFIT_ID ($CAPAS capas)"
test "$CAPAS" -ge 2 || { echo "FALLO: recommend no armo outfit multicapa"; exit 1; }

step "5/7 protocolo A-Pose (spec 4.1.5)"
CODE="$(curl -s -o /tmp/apose_neg.body -w '%{http_code}' \
  -F "user_image=@$SAMPLES/usuario_apose.jpg" -F "outfit_id=$OUTFIT_ID" \
  "$API/api/v1/vton/try-on")"
test "$CODE" = "422" || { echo "FALLO: la foto no canonica debe dar 422 (dio $CODE)"; exit 1; }
grep -q "A-Pose" /tmp/apose_neg.body
echo "rechazo correcto: HTTP 422 — $(head -c 160 /tmp/apose_neg.body)"

step "6/7 VTON multicapa ($PROVIDER, $CAPAS capas)"
JOB="$(curl -sf -F "user_image=@$SAMPLES/usuario_canonico.jpg" -F "outfit_id=$OUTFIT_ID" \
  "$API/api/v1/vton/try-on")"
JOB_ID="$(json_get "$JOB" job_id)"
echo "job: $JOB_ID (estado inicial: $(json_get "$JOB" status))"

STATUS=""
for _ in $(seq 1 150); do
  STATUS="$(curl -sf "$API/api/v1/vton/status/$JOB_ID")"
  S="$(json_get "$STATUS" status)"
  [ "$S" = "completed" ] || [ "$S" = "failed" ] && break
  sleep 2
done
echo "$STATUS"
test "$(json_get "$STATUS" status)" = "completed" || { echo "FALLO: job no completado"; exit 1; }
RESULT_URL="$(json_get "$STATUS" result_url)"
curl -sf -o /dev/null -w "resultado accesible: HTTP %{http_code}\n" "$RESULT_URL"

step "7/7 frontend"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$WEB")"
test "$CODE" = "200" || { echo "FALLO: frontend HTTP $CODE"; exit 1; }
echo "frontend: HTTP $CODE"

printf "\nSMOKE OK — provider=%s, outfit=%s (%s capas)\n" "$PROVIDER" "$OUTFIT_ID" "$CAPAS"
