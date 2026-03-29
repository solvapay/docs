---
name: provider-onboarding-doc-alignment
overview: "Align docs with the new provider onboarding sequence: company name capture on the first onboarding screen, guided first-product creation with embedded pricing configuration and path selection, and post-product Stripe setup guidance."
todos:
  - id: map-onboarding-deltas
    content: Map all mismatches between current docs and new provider onboarding sequence across Get started pages.
    status: pending
  - id: update-get-started-pages
    content: Revise core Get started docs (create-account, create-product, choose-your-path, go-live, index) to reflect the new end-to-end flow.
    status: pending
  - id: update-path-specific-pages
    content: Align MCP Pay and SDK getting-started pages with the same onboarding order and terminology.
    status: pending
  - id: navigation-review
    content: Review docs.json labels/order for clarity around onboarding + first product guidance.
    status: pending
  - id: docs-validation
    content: Validate links and consistency (broken links + outdated flow statements) before finalizing.
    status: pending
isProject: false
---

# Provider onboarding docs alignment plan

## Canonical flow to reflect across docs

1. Provider signs up/logs in.
2. Provider completes onboarding form with company name, website URL, country, and currency.
3. Provider is guided to create their first product and configures pricing plans inside that same product flow (not as a separate step), then chooses one path:
  - Hosted MCP Server auth + monetization (no-code)
  - SDK-integrated product
4. After first product creation, provider lands on dashboard.
5. Provider is guided to complete Stripe payments setup:
  - Connect an existing Stripe account, or
  - Complete details to create a new Stripe account.

## Documents to update (high priority)

- [docs/get-started/create-account.mdx](docs/get-started/create-account.mdx)
  - Rewrite from "dashboard-first" to "onboarding-form-first".
  - Add explicit field list for the first onboarding screen (company name, website URL, country, currency).
  - Move Stripe setup from immediate post-signup to post-first-product guidance.
- [docs/get-started/create-product.mdx](docs/get-started/create-product.mdx)
  - Reframe as the required first guided action after onboarding form submission.
  - Explicitly state pricing is configured during product creation and is not a separate prerequisite step.
  - Clarify that path selection (Hosted MCP vs SDK) happens during first product creation.
  - Ensure wording matches "product" and "plan" terminology.
- [docs/get-started/choose-your-path.mdx](docs/get-started/choose-your-path.mdx)
  - Reposition as path-comparison reference page (not a separate mandatory step before product creation).
  - Link from first-product flow as optional decision support.
- [docs/get-started/go-live.mdx](docs/get-started/go-live.mdx)
  - Update onboarding checklist order: first product already exists before dashboard access.
  - Replace outdated "Plans section" language with product-embedded pricing plan language.
  - Add/confirm two Stripe branches (existing account vs new account completion).
- [docs/index.mdx](docs/index.mdx)
  - Update "Get started" card/supporting text to match onboarding-form -> first-product -> Stripe progression.

## Documents to update (consistency pass)

- [docs/get-started/test-in-sandbox.mdx](docs/get-started/test-in-sandbox.mdx)
  - Ensure prerequisites imply first product exists and Stripe setup state is clear for sandbox testing.
- [docs/mcp-pay/quick-start.mdx](docs/mcp-pay/quick-start.mdx)
  - Align prerequisites with new onboarding sequence and first product guidance.
  - Remove any suggestion that plans must be created in a separate pre-product step.
- [docs/mcp-pay/create-hosted-mcp-pay-product.mdx](docs/mcp-pay/create-hosted-mcp-pay-product.mdx)
  - Clarify this can be the guided first product path during onboarding.
- [docs/sdks/typescript/getting-started/introduction.mdx](docs/sdks/typescript/getting-started/introduction.mdx)
  - Align setup narrative with first product creation and later Stripe completion.
- [docs/sdks/typescript/getting-started/core-concepts.mdx](docs/sdks/typescript/getting-started/core-concepts.mdx)
  - Confirm product/plan language and any references to dashboard/order of actions remain accurate.
  - Ensure it clearly reflects plans as embedded in product configuration.

## Navigation and IA checks

- [docs/docs.json](docs/docs.json)
  - Keep current sidebar unless a dedicated onboarding page is introduced.
  - If needed, consider renaming `create-account` sidebar title to reflect sign-up + provider onboarding details.

## QA and validation

- Run link and structure validation after edits (`mint broken-links`, `mint validate`).
- Verify no page still implies users see dashboard before completing onboarding form + first product.
- Verify no page still implies pricing plans are created in a separate step before product creation.
- Verify Stripe setup is consistently described as post-first-product guidance with both connection paths.

