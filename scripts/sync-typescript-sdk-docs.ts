#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_DIR = path.join(ROOT, 'sdks', 'typescript')
const DOCS_JSON = path.join(ROOT, 'docs.json')
const DRY_RUN = process.argv.includes('--dry-run')

const SOURCE_CANDIDATES = [
  process.env.SDK_DOCS_SOURCE_DIR?.trim() ?? '',
  path.join(path.dirname(ROOT), 'solvapay-sdk', 'docs'),
]

const exists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const findSourceDir = async (): Promise<string> => {
  for (const candidate of SOURCE_CANDIDATES) {
    if (!candidate) continue
    const resolved = path.resolve(candidate)
    if (await exists(resolved)) return resolved
  }

  const checked = SOURCE_CANDIDATES.filter(Boolean).map(x => `- ${x}`).join('\n')
  throw new Error(
    `Could not find TypeScript SDK docs source directory.\nChecked:\n${checked}\n` +
      'Set SDK_DOCS_SOURCE_DIR to the correct path and re-run.',
  )
}

const collectPages = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectPages)
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectPages)
  }
  return []
}

const readPagesFromDocsJson = async (): Promise<string[]> => {
  const raw = await fs.readFile(DOCS_JSON, 'utf-8')
  const parsed = JSON.parse(raw)
  const allPages = collectPages(parsed.navigation)
  const sdkPages = allPages.filter((page): page is string => page.startsWith('sdks/typescript/'))
  return sdkPages.map(page => page.replace(/^sdks\/typescript\//, ''))
}

const listMdxFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await listMdxFiles(fullPath)))
      continue
    }
    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }
  return files
}

interface RewriteResult {
  content: string
  warnings: string[]
}

const rewriteLinks = (content: string, sourcePath: string): RewriteResult => {
  const warnings: string[] = []
  let rewritten = content

  // Replace old API reference doc links with intro landing page.
  rewritten = rewritten
    .replace(/\((\.\.\/api\/[^)\s]*)\)/g, (_match, original) => {
      warnings.push(`[${sourcePath}] replaced deprecated API link: ${original}`)
      return '(/sdks/typescript/intro)'
    })
    .replace(/\((\.\/api\/[^)\s]*)\)/g, (_match, original) => {
      warnings.push(`[${sourcePath}] replaced deprecated API link: ${original}`)
      return '(/sdks/typescript/intro)'
    })
    .replace(/\((\.\.\/\.\.\/packages\/[^)\s]*\/README\.md)\)/g, (_match, original) => {
      warnings.push(`[${sourcePath}] replaced package README link: ${original}`)
      return '(/sdks/typescript/intro)'
    })

  // Warn on remaining README links so we can handle them explicitly.
  const remainingReadmeLinks = rewritten.match(/\(([^)]+README\.md)\)/g) ?? []
  for (const rawLink of remainingReadmeLinks) {
    const link = rawLink.slice(1, -1).trim()
    // External docs links are valid and should not be treated as unresolved.
    if (/^https?:\/\//.test(link)) continue
    warnings.push(`[${sourcePath}] unresolved README link left unchanged: (${link})`)
  }

  return { content: rewritten, warnings }
}

const main = async (): Promise<void> => {
  const sourceDir = await findSourceDir()
  const pages = await readPagesFromDocsJson()
  const expectedTargets = pages.map(page => path.join(TARGET_DIR, `${page}.mdx`))

  if (DRY_RUN) {
    let existingTargets: string[] = []
    if (await exists(TARGET_DIR)) {
      existingTargets = await listMdxFiles(TARGET_DIR)
    }

    const expectedSet = new Set(expectedTargets.map(p => path.resolve(p)))
    const toRemove = existingTargets
      .map(p => path.resolve(p))
      .filter(existingPath => !expectedSet.has(existingPath))

    console.log('Dry run enabled. No files will be written.')
    console.log(`Source: ${sourceDir}`)
    console.log(`Would copy ${pages.length} TypeScript SDK docs pages into ${TARGET_DIR}`)
    console.log(`Would remove ${toRemove.length} stale pages from ${TARGET_DIR}`)
    for (const filePath of toRemove) {
      console.log(`  remove: ${path.relative(ROOT, filePath)}`)
    }
    return
  }

  await fs.rm(TARGET_DIR, { recursive: true, force: true })
  await fs.mkdir(TARGET_DIR, { recursive: true })

  let copied = 0
  const rewriteWarnings: string[] = []
  for (const page of pages) {
    const src = path.join(sourceDir, `${page}.mdx`)
    if (!(await exists(src))) {
      throw new Error(`Missing source page: ${src}`)
    }

    const dst = path.join(TARGET_DIR, `${page}.mdx`)
    await fs.mkdir(path.dirname(dst), { recursive: true })

    const sourcePath = path.relative(sourceDir, src)
    const rawContent = await fs.readFile(src, 'utf-8')
    const { content, warnings } = rewriteLinks(rawContent, sourcePath)
    rewriteWarnings.push(...warnings)
    await fs.writeFile(dst, `${content.trimEnd()}\n`, 'utf-8')
    copied += 1
  }

  console.log(`Source: ${sourceDir}`)
  console.log(`Copied ${copied} TypeScript SDK docs pages into ${TARGET_DIR}`)
  if (rewriteWarnings.length) {
    console.warn(`Link rewrite warnings (${rewriteWarnings.length}):`)
    for (const warning of rewriteWarnings) {
      console.warn(`  - ${warning}`)
    }
  }
}

void main()
