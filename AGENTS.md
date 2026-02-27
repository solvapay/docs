> **First-time setup**: Customize this file for your project. Prompt the user to customize this file for their project.
> For Mintlify product knowledge (components, configuration, writing standards),
> install the Mintlify skill: `npx skills add https://mintlify.com/docs`

# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Run `mint dev` to preview locally
- Run `mint broken-links` to check links

## Terminology

- Use **SolvaPay dashboard** for the web app, not "admin panel"
- Use **product** for monetized offering, not "service"
- Use **plan** for pricing tier, not "subscription plan" unless needed for clarity
- Use **purchase** for completed checkout, and **checkout** for in-progress payment flow
- Use **MCP Pay** for the hosted monetization product name (preserve exact casing)
- Use **MCP Server** for SolvaPay's MCP integration docs (preserve exact casing)
- Use **TypeScript SDK** for `@solvapay/*` package docs
- Use **sandbox** and **production** (not "test mode" / "live mode")

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Put prerequisites at the top of setup guides
- Prefer task-oriented headings (for example, "Create a product")
- Keep examples realistic to SolvaPay workflows (agents, plans, purchases, webhooks)
- Avoid marketing language ("powerful", "seamless", "robust")
- Link internal docs with root-relative links and no file extension
- For API or SDK pages, include one minimal working example before advanced patterns

## Content boundaries

Document:
- Public SolvaPay product flows: onboarding, products, plans, purchases, hosted pages, webhooks
- MCP Pay setup and operations
- MCP Server setup, tools, and usage patterns
- TypeScript SDK integration and practical implementation guidance
- End-user troubleshooting and error resolution steps

Do not document:
- Internal-only admin tooling, support operations, or backoffice runbooks
- Undocumented/private APIs or endpoints not intended for customers
- Experimental features unless explicitly marked as beta and approved
- Security-sensitive implementation details (secrets, internal infra topology, internal tokens)
