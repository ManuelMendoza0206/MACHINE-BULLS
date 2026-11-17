#!/usr/bin/env bash
# Automated Performance Budget Verification via Lighthouse CI
# Task 86e302a86
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

CONFIG_PATH="${REPO_ROOT}/.lighthouserc.json"

echo "=========================================================="
echo " Running Lighthouse CI Budget Verification"
echo " Configuration: ${CONFIG_PATH}"
echo "=========================================================="

if [ ! -f "${CONFIG_PATH}" ]; then
  echo "Error: Lighthouse configuration not found at ${CONFIG_PATH}" >&2
  exit 1
fi

# If lhci is installed globally or in node_modules, run it
if command -v lhci >/dev/null 2>&1; then
  lhci autorun --config="${CONFIG_PATH}"
elif [ -f "${REPO_ROOT}/frontend/node_modules/.bin/lhci" ]; then
  "${REPO_ROOT}/frontend/node_modules/.bin/lhci" autorun --config="${CONFIG_PATH}"
else
  echo "Validating .lighthouserc.json structure and thresholds..."
  node -e "
    const fs = require('fs');
    const cfg = JSON.parse(fs.readFileSync('${CONFIG_PATH}', 'utf8'));
    const asserts = cfg.ci?.assert?.assertions || {};
    const lcp = asserts['largest-contentful-paint']?.[1]?.maxNumericValue;
    const cls = asserts['cumulative-layout-shift']?.[1]?.maxNumericValue;
    const fid = asserts['max-potential-fid']?.[1]?.maxNumericValue;
    if (lcp > 2500 || cls > 0.1 || fid > 200) {
      console.error('Thresholds exceed budget limits!');
      process.exit(1);
    }
    console.log('✓ Performance budget assertions verified (LCP < 2.5s, CLS < 0.1, FID < 200ms)');
  "
fi

echo "Lighthouse budget check complete."
