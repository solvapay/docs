# API reference ownership

The OpenAPI file under `api-reference/openapi.json` is generated content.

## Source of truth

- Canonical source is the deployed backend OpenAPI endpoint.
- This Mintlify repo is a publishing target for that generated spec.
- Published scope is fail-closed: only operations under `/v1/sdk/*` are included in docs output.
- Non-`/v1/sdk/*` operations are treated as internal and excluded.

## Editing policy

- Do not manually edit `api-reference/openapi.json`.
- To update it manually, run:
  - `npx --yes tsx scripts/sync-backend-openapi.ts`
- For non-default environments, set:
  - `BACKEND_OPENAPI_URL="https://api.solvapay.com/v1/openapi.json"`

## Manual sync workflow

- Primary path: run `npx --yes tsx scripts/sync-backend-openapi.ts` locally, review diff, and commit manually.
- Optional path: run docs workflow `.github/workflows/sync-backend-openapi.yml` via `workflow_dispatch`.

This keeps API docs aligned with backend changes while you keep full manual control.
