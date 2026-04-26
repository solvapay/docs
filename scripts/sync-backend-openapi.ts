#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_FILE = path.join(ROOT, 'api-reference', 'openapi.json')
const SOURCE_URL =
  process.env.BACKEND_OPENAPI_URL?.trim() || 'https://api-dev.solvapay.com/v1/openapi.json'

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

const main = async (): Promise<void> => {
  const source = await fetchOpenApi(SOURCE_URL)
  const {
    keptOperations: keptExternalOperations,
    removedOperations: removedNonExternalOperations,
    removedPaths: removedNonExternalPaths,
  } = filterExternalOperations(source)
  const {
    removedOperations: removedDeprecatedOperations,
    removedPaths: removedDeprecatedPaths,
  } = filterDeprecatedOperations(source)
  const prunedSchemas = pruneUnreferencedSchemas(source)
  const sanitizedSchemaFields = sanitizeNonStandardSchemaFields(source)
  const removedIncompatibleResponses = sanitizeMintlifyIncompatibleResponses(source)
  const { next: rewrittenPublicUrls, rewrites: rewrittenPublicUrlCount } = rewritePublicOauthUrls(
    source,
  )
  assertOpenApiShape(rewrittenPublicUrls)

  const stable = sortDeep(rewrittenPublicUrls)
  await fs.mkdir(path.dirname(TARGET_FILE), { recursive: true })
  await fs.writeFile(TARGET_FILE, `${JSON.stringify(stable, null, 2)}\n`, 'utf-8')

  console.log(`Source: ${SOURCE_URL}`)
  console.log(`Kept external operations (/v1/sdk/*): ${keptExternalOperations}`)
  console.log(`Filtered non-external operations: ${removedNonExternalOperations}`)
  console.log(`Removed empty paths after external filter: ${removedNonExternalPaths}`)
  console.log(`Filtered deprecated operations: ${removedDeprecatedOperations}`)
  console.log(`Removed empty paths after deprecated filter: ${removedDeprecatedPaths}`)
  console.log(`Pruned unreachable schemas: ${prunedSchemas}`)
  console.log(`Sanitized non-standard schema fields (selfRequired, additionalProperties={}): ${sanitizedSchemaFields}`)
  console.log(`Sanitized response-level examples: ${removedIncompatibleResponses}`)
  console.log(`Rewritten OAuth public URLs: ${rewrittenPublicUrlCount}`)
  console.log(`Updated: ${TARGET_FILE}`)
}

void main()
