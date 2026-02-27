#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

npx --yes tsx "$ROOT_DIR/scripts/sync-typescript-sdk-docs.ts"
