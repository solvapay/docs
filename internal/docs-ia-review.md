---
title: "Docs IA review (internal)"
description: "Internal audit and review output for SolvaPay documentation information architecture refresh."
---

# SolvaPay docs IA review

This file captures the concrete review output used to execute the IA refresh.

## 1) Navigation and entry-point review

### Findings

- New users could reach feature areas quickly, but the old nav made intent selection harder than necessary.
- The no-code MCP integration, `MCP Server`, and SDK MCP integration were easy to confuse on first read.
- `Meters` as a standalone nav group over-emphasized implementation detail over user jobs.
- The homepage did not consistently lead with SolvaPay's product-layer framing.

### Decisions applied

- Added a task-oriented `Guides` group in `docs.json`.
- Kept product/reference depth, but made entry paths intent-first.
- Renamed nav group labels to explain function first (`No-code MCP integration`, `Admin MCP Server`).
- Removed standalone `Meters` from published navigation.

## 2) Product-story review

### Findings

- The docs discussed capabilities but did not consistently present one clear product narrative.
- The no-code MCP integration appeared without enough explanatory text in some entry pages.
- Admin MCP positioning existed, but was not consistently foregrounded as provider-facing.
- Inline React checkout existed in SDK docs but was not promoted as a secondary product surface.

### Decisions applied

- Home and path-selection pages now lead with: SolvaPay as the product layer for monetizing MCP servers and apps.
- The no-code MCP integration is presented as hosted auth and monetization, described by its function rather than a brand name.
- Admin MCP is explicitly positioned as provider account management and checkout-session operations.
- Added a dedicated inline checkout guide to increase discoverability.

## 3) Duplication and overlap review

### Findings

- Webhooks content spans product docs and SDK docs.
- MCP concepts span the no-code MCP integration, admin MCP operations, and SDK MCP integration.
- Usage/metering concepts are referenced across plans, the no-code MCP integration, and SDK usage events.

### Decisions applied

- Added intent guides that route users to canonical pages, instead of repeating details.
- Kept SDK implementation details in `sdks/typescript/**` (synced ownership unchanged).
- Kept product behavior in product docs and improved cross-links.

## 4) Hidden and low-priority content review

### Findings

- `wallet/**` exists but is intentionally not in published navigation.
- `migration/**` was migration-era content no longer needed for user-facing docs.
- `meters/**` pages may still be useful references, but should not be first-class navigation.

### Decisions applied

- `wallet/**` remains out of published navigation.
- `meters/**` removed from published navigation.
- `migration/**` designated for removal with associated generator and CI check cleanup.

## 5) Published page inventory and classification

Classification values:

- `onboarding`
- `concept`
- `task-guide`
- `recipe`
- `reference`
- `hidden-internal`

| Path | Classification | Notes |
|---|---|---|
| `index` | onboarding | Primary entry page |
| `get-started/index` | onboarding | Legacy bridge page |
| `get-started/create-account` | onboarding | Account setup |
| `get-started/choose-your-path` | onboarding | Path selection |
| `get-started/create-product` | onboarding | Product bootstrap |
| `get-started/test-in-sandbox` | onboarding | Sandbox validation |
| `get-started/go-live` | onboarding | Production launch |
| `guides/monetize-mcp-server-no-code` | task-guide | No-code MCP path |
| `guides/add-paywall-to-api-or-app` | task-guide | SDK path |
| `guides/add-inline-chat-checkout-react` | recipe | Inline checkout |
| `guides/manage-account-with-admin-mcp` | task-guide | Admin MCP operations |
| `guides/handle-webhooks` | task-guide | Secure webhook handling |
| `no-code-mcp/overview` | concept | No-code MCP auth and monetization model |
| `no-code-mcp/quick-start` | task-guide | No-code setup |
| `no-code-mcp/create-no-code-mcp-product` | recipe | Product setup walkthrough |
| `no-code-mcp/authentication` | reference | Auth specifics |
| `no-code-mcp/hosted-pages` | concept | Hosted UX surfaces |
| `no-code-mcp/best-practices` | concept | Design guidance |
| `plans/overview` | concept | Plan models |
| `plans/billing` | reference | Billing behavior |
| `webhooks` | reference | Event contract + verification |
| `mcp-server/getting-started` | onboarding | Admin MCP entry |
| `mcp-server/testing-auth-and-paywall` | task-guide | Validation flow |
| `mcp-server/installation` | recipe | Client setup |
| `mcp-server/tools` | reference | Tool catalog |
| `mcp-server/examples` | recipe | Prompt-level examples |
| `mcp-server/faq` | reference | Clarifications |
| `sdks/typescript/intro` | onboarding | SDK entry |
| `sdks/typescript/setup/cli` | onboarding | SDK setup |
| `sdks/typescript/setup/installation` | onboarding | SDK install |
| `sdks/typescript/setup/quick-start` | task-guide | First protected endpoint |
| `sdks/typescript/setup/core-concepts` | concept | SDK concepts |
| `sdks/typescript/guides/express` | recipe | Framework guide |
| `sdks/typescript/guides/nextjs` | recipe | Framework guide |
| `sdks/typescript/guides/react` | recipe | Framework guide |
| `sdks/typescript/guides/mcp` | recipe | SDK MCP integration |
| `sdks/typescript/guides/custom-auth` | recipe | Auth integration |
| `sdks/typescript/guides/usage-events` | recipe | Usage tracking |
| `sdks/typescript/guides/webhooks` | recipe | SDK webhook handling |
| `sdks/typescript/guides/examples` | reference | Example index |
| `api-reference/openapi.json` | reference | Generated HTTP API reference |

## 6) Non-nav classification

| Path prefix | Classification | Decision |
|---|---|---|
| `wallet/**` | hidden-internal | Keep hidden from nav |
| `meters/**` | hidden-internal | Keep files, remove from nav |
| `migration/**` | hidden-internal | Remove |
| `internal/**` | hidden-internal | Keep for maintainers only |
