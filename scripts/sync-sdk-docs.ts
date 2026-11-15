#!/usr/bin/env -S npx --yes tsx

// Copies the SDK docs pages from the solvapay-sdk repo into sdks/<language>/.
//
//   npx --yes tsx scripts/sync-sdk-docs.ts [--dry-run] [--lang typescript|python|go]
//
// Each language's pages are written next to its code in solvapay-sdk:
//   typescript <- docs/        python <- python/docs/        go <- go/docs/
// The pages to copy are the ones docs.json lists under sdks/<language>/.
// The SDK checkout is SDK_REPO_DIR, or ../solvapay-sdk next to this repo.

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DOCS_JSON = path.join(ROOT, 'docs.json')
const DRY_RUN = process.argv.includes('--dry-run')

const LANGUAGES = {
  typescript: { source: 'docs', label: 'TypeScript' },
  python: { source: 'python/docs', label: 'Python' },
  go: { source: 'go/docs', label: 'Go' },
} as const
type Language = keyof typeof LANGUAGES

const exists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const selectedLanguages = (): Language[] => {
  const index = process.argv.indexOf('--lang')
  if (index === -1) return Object.keys(LANGUAGES) as Language[]
  const value = process.argv[index + 1]
  if (!value || !(value in LANGUAGES)) {
    throw new Error(`--lang must be one of: ${Object.keys(LANGUAGES).join(', ')}`)
  }
  return [value as Language]
}

const sdkRepoDir = async (): Promise<string> => {
  const configured = process.env.SDK_REPO_DIR?.trim()
  const dir = path.resolve(configured || path.join(path.dirname(ROOT), 'solvapay-sdk'))
  if (!(await exists(path.join(dir, 'docs')))) {
    throw new Error(
      `No solvapay-sdk checkout at ${dir} (expected ${path.join(dir, 'docs')}).\n` +
        'Set SDK_REPO_DIR to the root of a solvapay-sdk checkout and re-run.',
    )
  }
  return dir
}

const collectPages = (value: unknown): string[] => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectPages)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectPages)
  return []
}

const pagesFor = async (language: Language): Promise<string[]> => {
  const parsed = JSON.parse(await fs.readFile(DOCS_JSON, 'utf-8'))
  const prefix = `sdks/${language}/`
  return collectPages(parsed.navigation)
    .filter(page => page.startsWith(prefix))
    .map(page => page.slice(prefix.length))
}

const listMdxFiles = async (dir: string): Promise<string[]> => {
  if (!(await exists(dir))) return []
  const files: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await listMdxFiles(fullPath)))
    else if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(fullPath)
  }
  return files
}

const rewriteLinks = (
  content: string,
  sourcePath: string,
  language: Language,
): { content: string; warnings: string[] } => {
  const warnings: string[] = []
  const intro = `(/sdks/${language}/intro)`
  const rewritten = content
    .replace(/\((\.\.?\/api\/[^)\s]*)\)/g, (_match, original) => {
      warnings.push(`[${sourcePath}] replaced deprecated API link: ${original}`)
      return intro
    })
    .replace(/\((\.\.\/\.\.\/packages\/[^)\s]*\/README\.md)\)/g, (_match, original) => {
      warnings.push(`[${sourcePath}] replaced package README link: ${original}`)
      return intro
    })

  return { content: rewritten, warnings }
}

const syncLanguage = async (sdkDir: string, language: Language): Promise<string[]> => {
  const { source, label } = LANGUAGES[language]
  const sourceDir = path.join(sdkDir, source)
  const targetDir = path.join(ROOT, 'sdks', language)
  const pages = await pagesFor(language)
  if (pages.length === 0) {
    throw new Error(`docs.json lists no sdks/${language}/ pages`)
  }
  const missing = []
  for (const page of pages) {
    if (!(await exists(path.join(sourceDir, `${page}.mdx`)))) missing.push(`${source}/${page}.mdx`)
  }
  if (missing.length) {
    throw new Error(`Missing ${label} SDK source pages in ${sdkDir}:\n  ${missing.join('\n  ')}`)
  }

  const expected = new Set(pages.map(page => path.resolve(targetDir, `${page}.mdx`)))
  const stale = (await listMdxFiles(targetDir)).filter(p => !expected.has(path.resolve(p)))
  const unlisted = (await listMdxFiles(sourceDir))
    .map(p => path.relative(sourceDir, p).replace(/\.mdx$/, ''))
    .filter(page => !pages.includes(page))

  if (DRY_RUN) {
    console.log(`${label}: would copy ${pages.length} pages from ${sourceDir} into ${targetDir}`)
    for (const p of stale) console.log(`  remove: ${path.relative(ROOT, p)}`)
  } else {
    await fs.rm(targetDir, { recursive: true, force: true })
    for (const page of pages) {
      const src = path.join(sourceDir, `${page}.mdx`)
      const dst = path.join(targetDir, `${page}.mdx`)
      await fs.mkdir(path.dirname(dst), { recursive: true })
      const { content, warnings } = rewriteLinks(
        await fs.readFile(src, 'utf-8'),
        path.relative(sdkDir, src),
        language,
      )
      await fs.writeFile(dst, `${content.trimEnd()}\n`, 'utf-8')
      for (const w of warnings) console.warn(`  warning: ${w}`)
    }
    console.log(`${label}: copied ${pages.length} pages from ${sourceDir} into ${targetDir}`)
  }
  return unlisted.map(page => `${source}/${page}.mdx`)
}

const main = async (): Promise<void> => {
  const sdkDir = await sdkRepoDir()
  if (DRY_RUN) console.log('Dry run: no files will be written.')
  const unlisted: string[] = []
  for (const language of selectedLanguages()) {
    unlisted.push(...(await syncLanguage(sdkDir, language)))
  }
  if (unlisted.length) {
    console.log(`Source pages not in docs.json (not copied):\n  ${unlisted.join('\n  ')}`)
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
