# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

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
- Use **included** for the per-cycle allowance (`LimitOption.cap`). Do not say "free units", "quota", or "allowance" in copy
- Use **overage** for usage beyond included, charged per meter noun
- Use **top up** / **top-up** for a one-off add of credits (`purpose: 'credit_topup'`)
- Use **auto-recharge** for the setting that tops up the credit wallet automatically. Do not say "automatic top-up" on auto-recharge surfaces
- Use **usage event** for one recorded data point. The HTTP path stays `POST /v1/sdk/meter-events`
- Do not use generic **units**, **quota**, **consumption** as a noun, or **calls**/**messages** as stand-ins for the default meter. A meter whose `unit` is "calls" may say "calls". Wire identifiers (`units`, `CHARGE_PERS = 'unit'`) stay
- Keep two remaining counts distinct: `LimitResponse.remaining` is leftover included allowance (`-1` = unlimited); `remainingUnits` is how many metered items the credit balance still covers

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
