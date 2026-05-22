#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "release-auto.sh is now a compatibility wrapper. Forwarding to release.sh..."
exec bash "$SCRIPT_DIR/release.sh" "$@"
