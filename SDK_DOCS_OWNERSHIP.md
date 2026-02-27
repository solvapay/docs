# TypeScript SDK docs ownership

The content under `sdks/typescript/` is upstream-owned documentation.

## Source of truth

- Canonical source lives in the TypeScript SDK docs source repo/path.
- This Mintlify repo is a publishing target for those docs.

## Editing policy

- Do not manually edit files in `sdks/typescript/`.
- Update SDK docs in the upstream source and run the sync script:
  - `./scripts/sync-typescript-sdk-docs.sh`

## Why

The SDK docs can be regenerated or overwritten by upstream updates.  
Syncing from a single source of truth prevents drift and broken docs.
