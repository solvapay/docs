#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_FILE = path.join(ROOT, 'api-reference', 'openapi.json')
const SOURCE_URL =
  process.env.BACKEND_OPENAPI_URL?.trim() || 'https://api-dev.solvapay.com/v1/openapi.json'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const assertOpenApiShape = (value: unknown): asserts value is Record<string, unknown> => {
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

const fetchOpenApi = async (url: string): Promise<unknown> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch OpenAPI spec (${response.status} ${response.statusText})`)
  }

  return response.json()
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

const main = async (): Promise<void> => {
  const source = await fetchOpenApi(SOURCE_URL)
  assertOpenApiShape(source)
  const {
    keptOperations: keptExternalOperations,
    removedOperations: removedNonExternalOperations,
    removedPaths: removedNonExternalPaths,
  } = filterExternalOperations(source)
  const {
    removedOperations: removedDeprecatedOperations,
    removedPaths: removedDeprecatedPaths,
  } = filterDeprecatedOperations(source)
  const removedIncompatibleResponses = sanitizeMintlifyIncompatibleResponses(source)

  const stable = sortDeep(source)
  await fs.mkdir(path.dirname(TARGET_FILE), { recursive: true })
  await fs.writeFile(TARGET_FILE, `${JSON.stringify(stable, null, 2)}\n`, 'utf-8')

  console.log(`Source: ${SOURCE_URL}`)
  console.log(`Kept external operations (/v1/sdk/*): ${keptExternalOperations}`)
  console.log(`Filtered non-external operations: ${removedNonExternalOperations}`)
  console.log(`Removed empty paths after external filter: ${removedNonExternalPaths}`)
  console.log(`Filtered deprecated operations: ${removedDeprecatedOperations}`)
  console.log(`Removed empty paths after deprecated filter: ${removedDeprecatedPaths}`)
  console.log(`Sanitized response-level examples: ${removedIncompatibleResponses}`)
  console.log(`Updated: ${TARGET_FILE}`)
}

void main()
