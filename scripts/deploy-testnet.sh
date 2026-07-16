#!/usr/bin/env bash
# Builds, deploys, and generates TypeScript bindings for the Circlo contract
# on Stellar testnet. Idempotent: re-running redeploys a fresh instance and
# regenerates bindings against it.
#
# Usage: ./scripts/deploy-testnet.sh [deployer-identity-name]
#
# Requires: `stellar` CLI, `rustup target add wasm32v1-none`.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

DEPLOYER="${1:-deployer}"

if ! stellar keys address "$DEPLOYER" >/dev/null 2>&1; then
  echo "==> Generating and funding identity '$DEPLOYER' on testnet"
  stellar keys generate "$DEPLOYER" --network testnet --fund
fi

echo "==> Building contract"
stellar contract build

WASM_PATH="target/wasm32v1-none/release/circlo.wasm"

echo "==> Deploying to testnet"
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source-account "$DEPLOYER" \
  --network testnet \
  --alias circlo)

echo "==> Deployed contract: $CONTRACT_ID"

echo "==> Generating TypeScript bindings"
stellar contract bindings typescript \
  --network testnet \
  --contract-id "$CONTRACT_ID" \
  --output-dir packages/circlo-client \
  --overwrite

cat <<EOF

Done. Contract ID: $CONTRACT_ID

Next steps:
  1. Update frontend/src/config.ts with this contract id (if it changed).
  2. cd packages/circlo-client && npm install && npm run build
EOF
