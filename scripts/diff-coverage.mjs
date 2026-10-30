#!/usr/bin/env node
/**
 * Diff-coverage gate (docs/2026-10-30-phase1-audit-remediation-plan.md §1).
 *
 * Fails when any added or changed line under src/ is not covered according to
 * coverage/lcov.info (run `npm run test:coverage` first).
 *
 * What counts as "changed":
 *   - CI (`CI` env set) or `--base <ref>`: `git diff <base>...HEAD` (default base origin/main).
 *   - Locally: the working tree vs HEAD (`git diff HEAD`) plus untracked files under src/.
 *
 * Only executable lines are checked — lines with no `DA:` entry in the lcov report
 * (types, comments, imports, blank lines) are ignored. Tests, test helpers and the
 * generated OpenAPI types are excluded.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
const explicitBase = baseIndex >= 0 ? args[baseIndex + 1] : undefined
const lcovPath = path.join(root, 'coverage', 'lcov.info')

const EXCLUDE = [
  /\.test\.tsx?$/,
  /^src\/test\//,
  /^src\/api\/types\.gen\.ts$/,
  /\.d\.ts$/,
]

function git(...gitArgs) {
  // stderr ignored: on Windows git warns about CRLF conversion for every touched file.
  return execFileSync('git', gitArgs, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
}

function toPosix(file) {
  return file.split(path.sep).join('/')
}

function isGated(file) {
  return /^src\/.+\.(ts|tsx)$/.test(file) && !EXCLUDE.some((pattern) => pattern.test(file))
}

/** `git diff --unified=0` → Map<file, Set<line>> of added/changed lines (new-file numbering). */
export function parseUnifiedDiff(diff) {
  const changed = new Map()
  let file = null
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      const target = line.slice(4).trim()
      file = target === '/dev/null' ? null : target.replace(/^b\//, '')
      continue
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk && file) {
      const start = Number(hunk[1])
      const count = hunk[2] === undefined ? 1 : Number(hunk[2])
      const lines = changed.get(file) ?? new Set()
      for (let n = start; n < start + count; n += 1) lines.add(n)
      changed.set(file, lines)
    }
  }
  return changed
}

/** lcov.info → Map<file, Map<line, hits>>. */
export function parseLcov(text) {
  const files = new Map()
  let current = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (line.startsWith('SF:')) {
      const source = line.slice(3)
      const relative = toPosix(path.isAbsolute(source) ? path.relative(root, source) : source)
      current = new Map()
      files.set(relative, current)
    } else if (line.startsWith('DA:') && current) {
      const [lineNo, hits] = line.slice(3).split(',')
      current.set(Number(lineNo), Number(hits))
    } else if (line === 'end_of_record') {
      current = null
    }
  }
  return files
}

function changedLines() {
  const ci = Boolean(process.env.CI) || explicitBase !== undefined
  if (ci) {
    const base = explicitBase ?? 'origin/main'
    return { label: `${base}...HEAD`, changed: parseUnifiedDiff(git('diff', '--unified=0', '--no-color', `${base}...HEAD`, '--', 'src')) }
  }
  const changed = parseUnifiedDiff(git('diff', '--unified=0', '--no-color', 'HEAD', '--', 'src'))
  const untracked = git('ls-files', '--others', '--exclude-standard', '--', 'src').split('\n').filter(Boolean)
  for (const file of untracked) {
    const count = readFileSync(path.join(root, file), 'utf8').split('\n').length
    changed.set(file, new Set(Array.from({ length: count }, (_, index) => index + 1)))
  }
  return { label: 'working tree vs HEAD', changed }
}

function main() {
  if (!existsSync(lcovPath)) {
    console.error('diff-coverage: coverage/lcov.info not found — run `npm run test:coverage` first.')
    process.exit(1)
  }
  const coverage = parseLcov(readFileSync(lcovPath, 'utf8'))
  const { label, changed } = changedLines()

  const failures = []
  let checked = 0
  for (const [file, lines] of [...changed].sort(([a], [b]) => a.localeCompare(b))) {
    if (!isGated(file) || !existsSync(path.join(root, file))) continue
    const hits = coverage.get(file)
    if (!hits) {
      // Not instrumented at all: only a problem if the file has code (it never ran).
      failures.push({ file, lines: ['(file missing from coverage report)'] })
      continue
    }
    const uncovered = [...lines].filter((line) => hits.has(line) && hits.get(line) === 0).sort((a, b) => a - b)
    checked += [...lines].filter((line) => hits.has(line)).length
    if (uncovered.length > 0) failures.push({ file, lines: uncovered })
  }

  if (failures.length > 0) {
    console.error(`diff-coverage (${label}): uncovered changed lines`)
    for (const { file, lines } of failures) console.error(`  ${file}: ${lines.join(', ')}`)
    process.exit(1)
  }
  console.log(`diff-coverage (${label}): all ${checked} changed executable lines in src/ are covered.`)
}

main()
