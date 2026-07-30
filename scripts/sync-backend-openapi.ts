#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_FILE = path.join(ROOT, 'api-reference', 'openapi.json')

// The backend was split from a single monolith into independent NestJS services,
// each of which serves only its own slice of the API at its own
// `/v1/openapi.json`. There is no longer one aggregated document to fetch, so we
// pull every service that owns `/v1/sdk/*` routes and merge them. Only these
// five expose external SDK operations today (identity/mcp-registry/operations
// serve none), which is why they are the default local sources.
const DEFAULT_LOCAL_SOURCES = [
  'http://localhost:3002/v1/openapi.json', // provider-service
  'http://localhost:3003/v1/openapi.json', // payment-service
  'http://localhost:3004/v1/openapi.json', // billing-service
  'http://localhost:3005/v1/openapi.json', // commerce-service
  'http://localhost:3008/v1/openapi.json', // webhook-service
]

// Canonical top-level metadata for the aggregated public doc. The per-service
// specs each carry their own service title and no public `servers`, so we impose
// the same header the monolith's DocumentBuilder produced instead of leaking a
// single service's identity into the merged document.
const DOC_INFO = {
  title: 'SolvaPay REST API',
  description: 'The SolvaPay REST API specification',
  version: '1.0',
  contact: {},
}

const resolveSources = (): string[] => {
  const multi = process.env.BACKEND_OPENAPI_URLS?.trim()
  if (multi) {
    return multi
      .split(/[\s,]+/)
      .map(entry => entry.trim())
      .filter(Boolean)
  }

  const single = process.env.BACKEND_OPENAPI_URL?.trim()
  if (single) {
    return [single]
  }

  return DEFAULT_LOCAL_SOURCES
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertOpenApiShape: (value: unknown) => asserts value is Record<string, unknown> = value => {
  if (!isRecord(value)) {
    throw new Error('Invalid OpenAPI document: expected a JSON object at root')
  }

  if (typeof value.openapi !== 'string') {
    throw new Error('Invalid OpenAPI document: missing string field "openapi"')
  }

  if (!isRecord(value.info)) {
    throw new Error('Invalid OpenAPI document: missing object field "info"')
  }

  if (!isRecord(value.paths)) {
    throw new Error('Invalid OpenAPI document: missing object field "paths"')
  }
}

const sortDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortDeep)
  }

  if (!isRecord(value)) {
    return value
  }

  return Object.keys(value)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = sortDeep(value[key])
      return acc
    }, {})
}

const fetchOpenApi = async (url: string): Promise<Record<string, unknown>> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec (${response.status} ${response.statusText})`)
  }

  const payload: unknown = await response.json()
  assertOpenApiShape(payload)
  return payload
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const

const isExternalSdkPath = (pathKey: string): boolean => {
  const normalized = pathKey.replace(/^\/+/, '')
  return (
    normalized === 'sdk' ||
    normalized.startsWith('sdk/') ||
    normalized === 'v1/sdk' ||
    normalized.startsWith('v1/sdk/')
  )
}

const pruneEmptyPaths = (spec: Record<string, unknown>): number => {
  const paths = spec.paths
  if (!isRecord(paths)) {
    return 0
  }

  let removedPaths = 0
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) {
      continue
    }

    const hasOperation = HTTP_METHODS.some(method => isRecord(pathItem[method]))
    if (!hasOperation) {
      delete paths[pathKey]
      removedPaths += 1
    }
  }

  return removedPaths
}

const filterExternalOperations = (
  spec: Record<string, unknown>,
): { keptOperations: number; removedOperations: number; removedPaths: number } => {
  const paths = spec.paths
  if (!isRecord(paths)) {
    return { keptOperations: 0, removedOperations: 0, removedPaths: 0 }
  }

  let keptOperations = 0
  let removedOperations = 0
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) {
      continue
    }

    const isExternal = isExternalSdkPath(pathKey)
    for (const method of HTTP_METHODS) {
      if (!isRecord(pathItem[method])) {
        continue
      }

      if (isExternal) {
        keptOperations += 1
      } else {
        delete pathItem[method]
        removedOperations += 1
      }
    }
  }

  return {
    keptOperations,
    removedOperations,
    removedPaths: pruneEmptyPaths(spec),
  }
}

const collectSchemaRefs = (node: unknown, refs: Set<string>): void => {
  if (!node || typeof node !== 'object') return

  if (Array.isArray(node)) {
    for (const item of node) collectSchemaRefs(item, refs)
    return
  }

  const obj = node as Record<string, unknown>
  if (typeof obj.$ref === 'string') {
    const match = obj.$ref.match(/^#\/components\/schemas\/(.+)$/)
    if (match) refs.add(match[1])
  }

  for (const value of Object.values(obj)) collectSchemaRefs(value, refs)
}

const pruneUnreferencedSchemas = (spec: Record<string, unknown>): number => {
  const components = spec.components
  if (!isRecord(components)) return 0
  const schemas = components.schemas
  if (!isRecord(schemas)) return 0

  const reachable = new Set<string>()
  const queue: string[] = []

  collectSchemaRefs(spec.paths, reachable)
  queue.push(...reachable)

  while (queue.length > 0) {
    const name = queue.pop()!
    const schema = schemas[name]
    if (!schema) continue
    const nested = new Set<string>()
    collectSchemaRefs(schema, nested)
    for (const ref of nested) {
      if (!reachable.has(ref)) {
        reachable.add(ref)
        queue.push(ref)
      }
    }
  }

  let pruned = 0
  for (const name of Object.keys(schemas)) {
    if (!reachable.has(name)) {
      delete schemas[name]
      pruned++
    }
  }
  return pruned
}

const sanitizeNonStandardSchemaFields = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce<number>((sum, item) => sum + sanitizeNonStandardSchemaFields(item), 0)
  }

  if (!isRecord(value)) {
    return 0
  }

  let mutations = 0

  if ('selfRequired' in value) {
    delete value.selfRequired
    mutations += 1
  }

  if (
    'additionalProperties' in value &&
    isRecord(value.additionalProperties) &&
    Object.keys(value.additionalProperties).length === 0
  ) {
    value.additionalProperties = true
    mutations += 1
  }

  for (const child of Object.values(value)) {
    mutations += sanitizeNonStandardSchemaFields(child)
  }

  return mutations
}

const sanitizeMintlifyIncompatibleResponses = (spec: Record<string, unknown>): number => {
  const paths = spec.paths
  if (!isRecord(paths)) {
    return 0
  }

  let removed = 0
  for (const pathItem of Object.values(paths)) {
    if (!isRecord(pathItem)) {
      continue
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!isRecord(operation)) {
        continue
      }

      const responses = operation.responses
      if (!isRecord(responses)) {
        continue
      }

      for (const response of Object.values(responses)) {
        if (!isRecord(response)) {
          continue
        }

        if ('example' in response) {
          delete response.example
          removed += 1
        }

        if ('examples' in response) {
          delete response.examples
          removed += 1
        }

        if ('schema' in response && isRecord(response.schema)) {
          const responseSchema = response.schema
          const existingContent = response.content
          const content = isRecord(existingContent) ? existingContent : {}
          const existingJson = content['application/json']
          const jsonContent = isRecord(existingJson) ? existingJson : {}

          if (!('schema' in jsonContent)) {
            jsonContent.schema = responseSchema
          }

          if ('example' in responseSchema && !('example' in jsonContent)) {
            jsonContent.example = responseSchema.example
          }

          if ('examples' in responseSchema && !('examples' in jsonContent)) {
            jsonContent.examples = responseSchema.examples
          }

          content['application/json'] = jsonContent
          response.content = content
          delete response.schema
          removed += 1
        }

        const content = response.content
        if (isRecord(content)) {
          const jsonContent = content['application/json']
          if (isRecord(jsonContent) && isRecord(jsonContent.schema) && 'examples' in jsonContent.schema) {
            if (!('examples' in jsonContent)) {
              jsonContent.examples = jsonContent.schema.examples
            }
            delete jsonContent.schema.examples
            removed += 1
          }
        }
      }
    }
  }

  return removed
}

const filterDeprecatedOperations = (
  spec: Record<string, unknown>,
): { removedOperations: number; removedPaths: number } => {
  const paths = spec.paths
  if (!isRecord(paths)) {
    return { removedOperations: 0, removedPaths: 0 }
  }

  let removedOperations = 0

  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!isRecord(pathItem)) {
      continue
    }

    for (const method of HTTP_METHODS) {
      const operation = pathItem[method]
      if (!isRecord(operation)) {
        continue
      }

      if (operation.deprecated === true) {
        delete pathItem[method]
        removedOperations += 1
      }
    }

  }

  return { removedOperations, removedPaths: pruneEmptyPaths(spec) }
}

const PUBLIC_OAUTH_URL_REWRITES: Record<string, string> = {
  'https://api-dev.solvapay.com/v1/oauth/authorize': 'https://api.solvapay.com/v1/oauth/authorize',
  'https://api-dev.solvapay.com/v1/oauth/token': 'https://api.solvapay.com/v1/oauth/token',
}

const rewritePublicOauthUrls = (value: unknown): { next: unknown; rewrites: number } => {
  if (Array.isArray(value)) {
    let rewrites = 0
    const next = value.map(item => {
      const result = rewritePublicOauthUrls(item)
      rewrites += result.rewrites
      return result.next
    })
    return { next, rewrites }
  }

  if (typeof value === 'string') {
    const rewritten = PUBLIC_OAUTH_URL_REWRITES[value]
    if (rewritten) {
      return { next: rewritten, rewrites: 1 }
    }
    return { next: value, rewrites: 0 }
  }

  if (!isRecord(value)) {
    return { next: value, rewrites: 0 }
  }

  let rewrites = 0
  const next = Object.entries(value).reduce<Record<string, unknown>>((acc, [key, child]) => {
    const result = rewritePublicOauthUrls(child)
    acc[key] = result.next
    rewrites += result.rewrites
    return acc
  }, {})

  return { next, rewrites }
}

interface MergeResult {
  paths: Record<string, unknown>
  schemas: Record<string, unknown>
  securitySchemes: Record<string, unknown>
  keptExternalOperations: number
  conflicts: string[]
}

/**
 * Merge the SDK slice of every source spec into one document. Each source is
 * first reduced to `/v1/sdk/*` operations (via `filterExternalOperations`), then
 * only the schemas reachable from those operations are imported (a service's
 * internal, non-SDK DTOs are ignored — otherwise an orphan DTO in one service
 * could shadow the real definition owned by another). Services own disjoint
 * paths, so path collisions are unexpected and reported. Shared DTOs (e.g. error
 * envelopes) may legitimately repeat across services — identical duplicates are
 * silently deduped; genuine shape conflicts between two *referenced* definitions
 * are surfaced.
 */
const reachableSchemaNames = (
  paths: unknown,
  schemas: Record<string, unknown>,
): Set<string> => {
  const reachable = new Set<string>()
  collectSchemaRefs(paths, reachable)
  const queue = [...reachable]
  while (queue.length > 0) {
    const name = queue.pop()!
    const schema = schemas[name]
    if (!schema) continue
    const nested = new Set<string>()
    collectSchemaRefs(schema, nested)
    for (const ref of nested) {
      if (!reachable.has(ref)) {
        reachable.add(ref)
        queue.push(ref)
      }
    }
  }
  return reachable
}
const mergeSources = (sources: Array<{ url: string; doc: Record<string, unknown> }>): MergeResult => {
  const paths: Record<string, unknown> = {}
  const schemas: Record<string, unknown> = {}
  const securitySchemes: Record<string, unknown> = {}
  const conflicts: string[] = []
  let keptExternalOperations = 0

  for (const { url, doc } of sources) {
    const { keptOperations } = filterExternalOperations(doc)
    keptExternalOperations += keptOperations

    const docPaths = isRecord(doc.paths) ? doc.paths : {}
    for (const [pathKey, pathItem] of Object.entries(docPaths)) {
      if (pathKey in paths) {
        conflicts.push(`duplicate path "${pathKey}" (also in ${url})`)
        continue
      }
      paths[pathKey] = pathItem
    }

    const components = isRecord(doc.components) ? doc.components : {}

    const docSchemas = isRecord(components.schemas) ? components.schemas : {}
    const reachable = reachableSchemaNames(doc.paths, docSchemas)
    for (const [name, schema] of Object.entries(docSchemas)) {
      if (!reachable.has(name)) continue
      if (name in schemas) {
        if (JSON.stringify(schemas[name]) !== JSON.stringify(schema)) {
          conflicts.push(`schema "${name}" has conflicting shapes (also in ${url})`)
        }
        continue
      }
      schemas[name] = schema
    }

    const docSecurity = isRecord(components.securitySchemes) ? components.securitySchemes : {}
    for (const [name, scheme] of Object.entries(docSecurity)) {
      if (!(name in securitySchemes)) {
        securitySchemes[name] = scheme
      }
    }
  }

  return { paths, schemas, securitySchemes, keptExternalOperations, conflicts }
}

const findUnresolvedRefs = (spec: Record<string, unknown>): string[] => {
  const refs = new Set<string>()
  collectSchemaRefs(spec.paths, refs)
  collectSchemaRefs(isRecord(spec.components) ? spec.components.schemas : undefined, refs)
  const schemas =
    isRecord(spec.components) && isRecord(spec.components.schemas) ? spec.components.schemas : {}
  return [...refs].filter(name => !(name in schemas))
}

const main = async (): Promise<void> => {
  const sources = resolveSources()
  const fetched: Array<{ url: string; doc: Record<string, unknown> }> = []
  for (const url of sources) {
    fetched.push({ url, doc: await fetchOpenApi(url) })
  }

  const merged = mergeSources(fetched)

  const spec: Record<string, unknown> = {
    openapi: (fetched[0]?.doc.openapi as string) || '3.0.0',
    info: DOC_INFO,
    servers: [],
    tags: [],
    paths: merged.paths,
    components: {
      schemas: merged.schemas,
      securitySchemes: merged.securitySchemes,
    },
  }
  assertOpenApiShape(spec)

  const {
    removedOperations: removedDeprecatedOperations,
    removedPaths: removedDeprecatedPaths,
  } = filterDeprecatedOperations(spec)
  const prunedSchemas = pruneUnreferencedSchemas(spec)
  const sanitizedSchemaFields = sanitizeNonStandardSchemaFields(spec)
  const removedIncompatibleResponses = sanitizeMintlifyIncompatibleResponses(spec)
  const { next: rewrittenPublicUrls, rewrites: rewrittenPublicUrlCount } = rewritePublicOauthUrls(
    spec,
  )
  assertOpenApiShape(rewrittenPublicUrls)

  const unresolvedRefs = findUnresolvedRefs(rewrittenPublicUrls)
  if (unresolvedRefs.length > 0) {
    throw new Error(`Merged spec has unresolved schema refs: ${unresolvedRefs.join(', ')}`)
  }

  const stable = sortDeep(rewrittenPublicUrls)
  await fs.mkdir(path.dirname(TARGET_FILE), { recursive: true })
  await fs.writeFile(TARGET_FILE, `${JSON.stringify(stable, null, 2)}\n`, 'utf-8')

  console.log(`Sources (${fetched.length}):`)
  for (const { url } of fetched) console.log(`  - ${url}`)
  console.log(`Kept external operations (/v1/sdk/*): ${merged.keptExternalOperations}`)
  if (merged.conflicts.length > 0) {
    console.warn(`Merge conflicts (${merged.conflicts.length}):`)
    for (const conflict of merged.conflicts) console.warn(`  ! ${conflict}`)
  }
  console.log(`Filtered deprecated operations: ${removedDeprecatedOperations}`)
  console.log(`Removed empty paths after deprecated filter: ${removedDeprecatedPaths}`)
  console.log(`Pruned unreachable schemas: ${prunedSchemas}`)
  console.log(`Sanitized non-standard schema fields (selfRequired, additionalProperties={}): ${sanitizedSchemaFields}`)
  console.log(`Sanitized response-level examples: ${removedIncompatibleResponses}`)
  console.log(`Rewritten OAuth public URLs: ${rewrittenPublicUrlCount}`)
  console.log(`Updated: ${TARGET_FILE}`)
}

void main()
