# Documentation ownership

This file defines canonical ownership boundaries for SolvaPay docs content.

## Canonical sources

- **Product docs**: authored in this repository (`get-started`, `mcp-pay`, `mcp-server`, `plans`, `webhooks`, `guides`)
- **TypeScript SDK docs**: authored in `solvapay-sdk/docs`, synced into `sdks/typescript/**`
- **HTTP API reference**: generated from backend OpenAPI and synced to `api-reference/openapi.json`

## Naming boundaries

- **MCP Pay**: hosted MCP auth and monetization.
- **Admin MCP Server**: provider account MCP operations.
- **origin MCP server**: your own MCP endpoint that SolvaPay proxies or integrates with.

## Editing rules

- Do not manually edit `sdks/typescript/**`. Update source in SDK repo and run sync.
- Do not manually edit `api-reference/openapi.json`. Run the OpenAPI sync script.
- Keep product behavior explanations in product docs.
- Keep implementation details in SDK docs.
- Keep request/response/event contracts in reference pages.

## Hidden and internal content

- `wallet/**`: intentionally not in published navigation.
- `meters/**`: intentionally not in published navigation.
- `internal/**`: maintainer-only documents.
- `migration/**`: removed from active docs workflow.
