# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## Generated and synced content

Two parts of this repo are owned elsewhere. Never edit them by hand.

- `sdks/typescript/**` is owned by the `solvapay-sdk` repo (`docs/`). Fix SDK content in `solvapay-sdk/docs`, then run `npx --yes tsx scripts/sync-typescript-sdk-docs.ts` here (`--dry-run` first; set `SDK_DOCS_SOURCE_DIR` for a custom checkout). The page list comes from `docs.json`.
- `api-reference/openapi.json` is generated from the platform services' OpenAPI specs. Fix the spec in the `platform` repo, deploy, then run `npx --yes tsx scripts/sync-backend-openapi.ts` here. Doc-level metadata the script adds (`info`, `servers`) lives in that script. See `API_REFERENCE_OWNERSHIP.md`.
  - There's no public spec endpoint (`https://api.solvapay.com/v1/openapi.json` returns 404), so a sync needs the services running. Start platform locally (`npm run dev` in the platform repo; it needs `gcloud auth login` and `gcloud auth application-default login` first). Then fetch only the five services that own `/v1/sdk/*` routes:

    | Service | Local spec URL |
    |---|---|
    | provider-service | `http://localhost:3002/v1/openapi.json` |
    | payment-service | `http://localhost:3003/v1/openapi.json` |
    | billing-service | `http://localhost:3004/v1/openapi.json` |
    | commerce-service | `http://localhost:3005/v1/openapi.json` |
    | webhook-service | `http://localhost:3008/v1/openapi.json` |

    These are the script's defaults. To fetch from elsewhere, pass the URLs, space- or comma-separated, in `BACKEND_OPENAPI_URLS` (the `sync-backend-openapi.yml` workflow requires this). The sync only reads the specs; don't run seeds or migrations for it.
- After either sync, run `mint validate` and `mint broken-links`, review the diff, and list what changed in the PR.

## Terminology

- Use **SolvaPay Console** for the web app, not "admin panel" or "dashboard"
- Use **product** for monetized offering, not "service"
- Use **plan** for pricing tier, not "subscription plan" unless needed for clarity
- Use **purchase** for completed checkout, and **checkout** for in-progress payment flow
- Use **Managed MCP** for the managed auth and monetization path for MCP servers (nav/section label); use **Managed MCP** or **the managed path** as body shorthand. Do not use the retired "MCP Pay" or "Hosted MCP" names
- Use **MCP Server** for SolvaPay's MCP integration docs (preserve exact casing)
- Use **TypeScript SDK** for `@solvapay/*` package docs
- Use **sandbox** and **production** (not "test mode" / "live mode")
- Use **usage** as the umbrella noun (nav, analytics, "usage this month")
- Use the **meter noun** for counted quantity ("1,000 requests included"). The seeded default meter is `requests`
- Use **credits** only for the prepaid wallet. Peg: 100 credits = 1 USD cent
- Use **included** for the per-cycle plan cap (`LimitOption.cap`). Do not say "free units", "quota", or "allowance" for that count
- Use **free allowance** for the code-declared cap on `registerFree` (`FreeLimit`). Keep it distinct from **included**
- Use **overage** for usage beyond included, charged per meter noun
- Use **top up** / **top-up** for a one-off add of credits (`purpose: 'credit_topup'`)
- Use **auto-recharge** for the setting that tops up the credit wallet automatically. Do not say "automatic top-up" on auto-recharge surfaces
- Use **usage event** for one recorded data point. The HTTP path stays `POST /v1/sdk/meter-events`
- Do not use generic **units**, **quota**, **consumption** as a noun, or **calls**/**messages** as stand-ins for the default meter. A meter whose `unit` is "calls" may say "calls". Wire identifiers (`units`, `CHARGE_PERS = 'unit'`) stay
- Keep leftover counts distinct: `LimitResponse.remaining` is leftover included (`-1` = unlimited), except when the request named a `free-*` meter — then it is the free-allowance remainder. `remainingUnits` is how many metered items the credit balance still covers

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Put prerequisites at the top of setup guides
- Prefer task-oriented headings (for example, "Create a product")
- Keep examples realistic to SolvaPay workflows (products, plans, purchases, webhooks)
- Avoid marketing language ("powerful", "seamless", "robust")
- Link internal docs with root-relative links and no file extension
- For API or SDK pages, include one minimal working example before advanced patterns

## Content boundaries

Document:
- Public SolvaPay product flows: onboarding, products, plans, purchases, hosted pages, webhooks
- Managed MCP setup and operations
- MCP Server setup, tools, and usage patterns
- TypeScript SDK integration and practical implementation guidance
- End-user troubleshooting and error resolution steps

Do not document:
- Internal-only admin tooling, support operations, or backoffice runbooks
- Undocumented/private APIs or endpoints not intended for customers
- Experimental features unless explicitly marked as beta and approved
- Security-sensitive implementation details (secrets, internal infra topology, internal tokens)

## Commits and PRs

Never add Cursor (or any agent/tool) as `Co-Authored-By`. No "Generated with …"
trailer, `Made-with` trailer, or tool footer in commit messages or PR bodies.
