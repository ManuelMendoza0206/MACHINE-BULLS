#!/usr/bin/env bash
# Deploy Pipeline Wrapper with Automated Rollback
# Task 86e302a3f
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

TARGET_ENV="${1:-staging}"
NEW_VERSION="${2:-$(git rev-parse --short HEAD)}"
PREV_VERSION="${3:-HEAD~1}"
HEALTH_URL="${4:-http://localhost:8000/health}"

echo "=========================================================="
echo " Starting Safe Deploy: env=${TARGET_ENV}, version=${NEW_VERSION}"
echo "=========================================================="

python3 "${SCRIPT_DIR}/deploy_manager.py" \
  --env "${TARGET_ENV}" \
  --version "${NEW_VERSION}" \
  --previous-version "${PREV_VERSION}" \
  --health-url "${HEALTH_URL}" \
  --max-retries 5 \
  --backoff 1.0

EXIT_CODE=$?
if [ ${EXIT_CODE} -eq 0 ]; then
  echo "Deployment to ${TARGET_ENV} succeeded and verified."
else
  echo "Deployment failed and automated rollback was initiated."
fi
exit ${EXIT_CODE}
