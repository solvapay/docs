# TypeScript SDK publishing (internal)

This document is for SolvaPay maintainers only.
It captures internal release and npm publishing operations for the TypeScript SDK monorepo.

## Scope

- Release flow between `dev` and `main`
- Automated npm publishing workflows
- Stable and preview version strategy
- Tagging and dist-tag promotion
- Maintainer troubleshooting for release issues

## Source of truth

Use SDK repository workflow files as the source of truth:

- `.github/workflows/publish.yml`
- `.github/workflows/publish-preview.yml`
- `.github/workflows/tag-as-latest.yml`
- Workspace release scripts in `package.json`

If this file and workflows conflict, follow the workflow files.
