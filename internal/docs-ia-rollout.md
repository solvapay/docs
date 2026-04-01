# Docs IA rollout sequence

This is the execution order for the IA refresh.

## Phase 1: review and audit

1. Review navigation and entry points
2. Review product framing and naming
3. Review duplication and split authority
4. Review hidden/non-nav content
5. Produce page classification inventory

## Phase 2: navigation and entry-path updates

1. Update `docs.json` navigation groups and labels
2. Add intent-driven guides in `guides/**`
3. Update homepage and path-selection content
4. Clarify admin MCP and hosted MCP naming

## Phase 3: ownership and maintenance

1. Document canonical content ownership
2. Keep SDK sync boundary intact
3. Keep OpenAPI generation boundary intact
4. Keep hidden/internal sections out of nav

## Phase 4: cleanup

1. Remove migration content if no longer operationally required
2. Remove migration CI checks and tooling
3. Validate docs build and links

## Phase 5: follow-up content consolidation

1. Consolidate overlap in webhooks and usage narratives
2. Reduce repeated MCP explanations
3. Continue converting feature-first pages into intent-first guides
