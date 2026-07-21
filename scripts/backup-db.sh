#!/usr/bin/env bash
# Compatibility entrypoint for the G6 backup contract.
# Default behavior is PLAN_ONLY. Execution requires the explicit gates enforced
# by scripts/g6-backup-plan.mjs.

set -euo pipefail

TYPE="${1:-manual}"
if [ "$#" -gt 0 ]; then
  shift
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec node "${SCRIPT_DIR}/g6-backup-plan.mjs" --type "$TYPE" "$@"
