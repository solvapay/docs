#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

type MappingDecision = 'migrate' | 'drop' | 'internal-only'

interface MappingRow {
  section: string
  sourceFile: string
  oldUrl: string
  newUrl: string
  decision: MappingDecision
}

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const SCRAPED_DIR = path.join(ROOT, 'migration', 'scraped')
const OUTPUT_FILE = path.join(ROOT, 'migration', 'page-mapping.csv')
const DRY_RUN = process.argv.includes('--dry-run')
const CHECK = process.argv.includes('--check')

const toPosix = (value: string): string => value.replaceAll(path.sep, '/')

const walk = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(fullPath)
    }
  }

  return files
}

const toSection = (relativeStem: string): string => {
  if (relativeStem.startsWith('sdks/typescript/')) {
    return 'sdk-typescript'
  }
  return 'core'
}

const toOldUrl = (relativeStem: string): string => {
  if (relativeStem === 'getting-started') {
    return '/getting-started/index'
  }
  if (relativeStem.startsWith('sdks/typescript/getting-started/')) {
    const rest = relativeStem.replace('sdks/typescript/getting-started/', '')
    return `/sdks/typescript/setup/${rest}`
  }
  if (relativeStem === 'sdks/typescript/examples/overview') {
    return '/sdks/typescript/guides/examples'
  }
  return `/${relativeStem}`
}

const toNewUrl = (relativeStem: string): string => {
  if (relativeStem === 'getting-started') {
    return '/get-started/index'
  }
  if (relativeStem.startsWith('getting-started/')) {
    const rest = relativeStem.replace('getting-started/', '')
    return `/get-started/${rest}`
  }
  if (relativeStem.startsWith('sdks/typescript/getting-started/')) {
    const rest = relativeStem.replace('sdks/typescript/getting-started/', '')
    return `/sdks/typescript/setup/${rest}`
  }
  if (relativeStem === 'sdks/typescript/examples/overview') {
    return '/sdks/typescript/guides/examples'
  }
  if (relativeStem === 'sdks/typescript/publishing') {
    return '/internal/typescript-sdk/publishing.md'
  }
  return `/${relativeStem}`
}

const exists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

const detectDecision = async (newUrl: string): Promise<MappingDecision> => {
  if (newUrl.startsWith('/internal/')) {
    return 'internal-only'
  }

  const withoutLeadingSlash = newUrl.replace(/^\//, '')
  const directPath = path.join(ROOT, withoutLeadingSlash)

  if (newUrl.endsWith('.md') || newUrl.endsWith('.mdx')) {
    return (await exists(directPath)) ? 'migrate' : 'drop'
  }

  const mdxPath = `${directPath}.mdx`
  const indexMdxPath = path.join(directPath, 'index.mdx')
  if ((await exists(mdxPath)) || (await exists(indexMdxPath))) {
    return 'migrate'
  }

  return 'drop'
}

const csvEscape = (value: string): string => `"${value.replaceAll('"', '""')}"`

const toCsv = (rows: MappingRow[]): string => {
  const header = 'section,source_file,old_url,new_url,decision'
  const lines = rows.map(row =>
    [
      csvEscape(row.section),
      csvEscape(row.sourceFile),
      csvEscape(row.oldUrl),
      csvEscape(row.newUrl),
      csvEscape(row.decision),
    ].join(','),
  )
  return `${header}\n${lines.join('\n')}\n`
}

const main = async (): Promise<void> => {
  const scrapedFiles = await walk(SCRAPED_DIR)
  const rows: MappingRow[] = []

  for (const absolutePath of scrapedFiles) {
    const relativePath = toPosix(path.relative(SCRAPED_DIR, absolutePath))
    const relativeStem = relativePath.replace(/\.mdx$/, '')
    const newUrl = toNewUrl(relativeStem)
    rows.push({
      section: toSection(relativeStem),
      sourceFile: `migration/scraped/${relativePath}`,
      oldUrl: toOldUrl(relativeStem),
      newUrl,
      decision: await detectDecision(newUrl),
    })
  }

  rows.sort((a, b) => {
    if (a.section !== b.section) return a.section.localeCompare(b.section)
    return a.sourceFile.localeCompare(b.sourceFile)
  })

  const csv = toCsv(rows)

  if (CHECK) {
    let existing = ''
    try {
      existing = await fs.readFile(OUTPUT_FILE, 'utf-8')
    } catch {
      // file missing counts as mismatch
    }
    if (existing !== csv) {
      console.error('migration/page-mapping.csv is out of date.')
      console.error('Run: npx --yes tsx scripts/generate-migration-page-mapping.ts')
      process.exit(1)
    }
    console.log('migration/page-mapping.csv is up to date.')
    return
  }

  if (DRY_RUN) {
    console.log('Dry run enabled. No files were written.')
    console.log(`Generated ${rows.length} mapping rows from migration/scraped.`)
    return
  }

  await fs.writeFile(OUTPUT_FILE, csv, 'utf-8')
  console.log(`Generated ${rows.length} mapping rows at migration/page-mapping.csv`)
}

void main()
