#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[enterpriseai-matrix] Starting dual-profile validation matrix"

run_profile_validation() {
  local profile="$1"

  echo "[enterpriseai-matrix] === Profile: ${profile} ==="
  npm run generate-commands -- --workflow-profile "${profile}"

  npm run test -- \
    tests/integration/cross-platform-parity.test.ts \
    tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts
}

run_profile_validation "standard"
run_profile_validation "enterpriseai"

echo "[enterpriseai-matrix] Running enterpriseai regression + governance suite"
npm run test:unit
npm run test -- \
  tests/integration/enterpriseai/non-eai-output-regression.integration.test.ts \
  tests/integration/enterpriseai/capability-removal-approval.integration.test.ts \
  tests/integration/enterpriseai/architecture-approval-loop.integration.test.ts \
  tests/integration/enterpriseai/context-budget-warning.integration.test.ts \
  tests/integration/event-contract-coverage.test.ts \
  tests/integration/enterpriseai/internal-api-contract-coverage.integration.test.ts \
  tests/integration/enterpriseai/placeholder-conventions.integration.test.ts \
  tests/integration/enterpriseai/novice-e2e-walkthrough.integration.test.ts

echo "[enterpriseai-matrix] Running extension enterpriseai/onboarding integration suite"
(
  cd extension
  npm run test -- --grep "enterpriseai|onboarding"
  npm run compile-tests
)

echo "[enterpriseai-matrix] Running repository typecheck"
npm run typecheck

echo "[enterpriseai-matrix] Matrix completed successfully"
