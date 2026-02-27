# SolvaPay docs (Mintlify)

This repository hosts the Mintlify documentation site for SolvaPay.

## Ownership model

- Product docs (`getting-started`, `mcp-pay`, `wallet`, `mcp-server`) are maintained in this repository.
- TypeScript SDK docs (`sdks/typescript`) are upstream-owned and synced into this repository.
- API reference (`api-reference/openapi.json`) is generated from backend OpenAPI and synced manually.
- Do not manually edit `sdks/typescript/**`. Use the sync script.
- Do not manually edit `api-reference/openapi.json`. Use the sync script.

## AI-assisted writing

Set up your AI coding tool to work with Mintlify:

```bash
npx skills add https://mintlify.com/docs
```

This command installs Mintlify's documentation skill for your configured AI tools.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

## Syncing TypeScript SDK docs

Run the sync script from the docs root:

```bash
./scripts/sync-typescript-sdk-docs.sh
```

If your SDK docs source is in a custom location, set:

```bash
SDK_DOCS_SOURCE_DIR="/absolute/path/to/sdk/docs-site/sdks/typescript/docs" ./scripts/sync-typescript-sdk-docs.sh
```

The script uses `scripts/typescript-sdk-pages.txt` as the curated page list.

## Syncing backend OpenAPI docs

Run the sync script from the docs root:

```bash
npx --yes tsx scripts/sync-backend-openapi.ts
```

If you want to test against another backend environment, set:

```bash
BACKEND_OPENAPI_URL="https://api.solvapay.com/v1/openapi.json" npx --yes tsx scripts/sync-backend-openapi.ts
```

The sync uses fail-closed path filtering and only keeps external SDK operations under `/v1/sdk/*`.
Non-SDK operations (for example `ui/*`, admin, and internal endpoints) are excluded from published API reference output.

You can also run `.github/workflows/sync-backend-openapi.yml` manually (`workflow_dispatch`) if you prefer syncing through GitHub Actions.

See `API_REFERENCE_OWNERSHIP.md` for generated file ownership policy.

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
