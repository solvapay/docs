#!/usr/bin/env -S npx --yes tsx

import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const TARGET_DIR = path.join(ROOT, 'sdks', 'typescript')
const PAGES_FILE = path.join(ROOT, 'scripts', 'typescript-sdk-pages.txt')

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

const readPages = async (): Promise<string[]> => {
  const text = await fs.readFile(PAGES_FILE, 'utf-8')
  return text
    .split('\n')
    .map(x => x.trim())
    .filter(x => x && !x.startsWith('#'))
}

const rewriteLinks = (content: string): string => {
  return content
    .replace(/\(\.\.\/api\/[^)\s]*\)/g, '(/sdks/typescript/intro)')
    .replace(/\(\.\/api\/[^)\s]*\)/g, '(/sdks/typescript/intro)')
    .replace(/\(\.\.\/\.\.\/packages\/[^)\s]*\/README\.md\)/g, '(/sdks/typescript/intro)')
}

const main = async (): Promise<void> => {
  const sourceDir = await findSourceDir()
  const pages = await readPages()

  await fs.rm(TARGET_DIR, { recursive: true, force: true })
  await fs.mkdir(TARGET_DIR, { recursive: true })

  let copied = 0
  for (const page of pages) {
    const src = path.join(sourceDir, `${page}.mdx`)
    if (!(await exists(src))) {
      throw new Error(`Missing source page: ${src}`)
    }

    const dst = path.join(TARGET_DIR, `${page}.mdx`)
    await fs.mkdir(path.dirname(dst), { recursive: true })

    let content = await fs.readFile(src, 'utf-8')
    content = rewriteLinks(content)
    await fs.writeFile(dst, `${content.trimEnd()}\n`, 'utf-8')
    copied += 1
  }

  console.log(`Source: ${sourceDir}`)
  console.log(`Copied ${copied} TypeScript SDK docs pages into ${TARGET_DIR}`)
}

void main()
