#!/usr/bin/env node
/**
 * Safe git worktrees for parallel agent sessions on this monorepo.
 *
 * Why this exists (all three are scars this repo actually took):
 *  1. Parallel sessions sharing ONE working copy hijacked each other's commits
 *     onto stray branches. Isolation is the fix.
 *  2. Someone junctioned node_modules between worktrees to "save space". That
 *     corrupts the main copy's dependency tree (~18k tsc errors). This script
 *     always installs real, per-worktree deps and refuses to link them.
 *  3. Worktrees were created INSIDE .claude/worktrees/, where a stray file
 *     handle left an undeletable directory. Worktrees go beside the repo.
 *
 * Usage:
 *   node scripts/agent-worktree.mjs new <slug>     create + branch + npm ci
 *   node scripts/agent-worktree.mjs list           show worktrees and health
 *   node scripts/agent-worktree.mjs done <slug>    verify clean, remove, prune
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const REPO = path.resolve(import.meta.dirname, '..', '..', '..')
const git = (...a) => execFileSync('git', a, { cwd: REPO, encoding: 'utf8' }).trim()
const run = (cmd, args, cwd) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })

const [cmd, slug] = process.argv.slice(2)
const wtPath = (s) => path.join(path.dirname(REPO), `Peroot-wt-${s}`)
const branch = (s) => `agent/${s}`

function assertSlug() {
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error('slug must be kebab-case, e.g. "sentry-init". Got:', slug ?? '(none)')
    process.exit(1)
  }
}

if (cmd === 'new') {
  assertSlug()
  const dir = wtPath(slug)
  if (fs.existsSync(dir)) { console.error(`${dir} already exists.`); process.exit(1) }
  console.log(`→ fetching origin/main`)
  git('fetch', 'origin', 'main')
  console.log(`→ worktree ${dir} on ${branch(slug)} (from origin/main)`)
  git('worktree', 'add', '-b', branch(slug), dir, 'origin/main')

  // Real deps, never a junction. This is the whole point.
  const web = path.join(dir, 'Prut', 'web')
  console.log('→ npm ci (own node_modules — never link or junction these)')
  run('npm', ['ci'], web)

  fs.writeFileSync(path.join(dir, 'AGENT-SCOPE.md'),
`# Agent scope: ${slug}

Branch: \`${branch(slug)}\`  ·  base: \`origin/main\`

## Files I own this session
<!-- List them BEFORE editing. Another agent reads this to stay out of your way. -->
- 

## Files I must NOT touch
- Anything listed in another worktree's AGENT-SCOPE.md

## Done means
\`\`\`bash
cd Prut/web && npm run typecheck && npm run test && npm run build
\`\`\`
then open a PR. Do not push straight to main from a worktree.
`)
  console.log(`\n✓ ready: ${dir}`)
  console.log(`  next: cd "${dir}" && edit AGENT-SCOPE.md first, then work.`)
}

else if (cmd === 'list') {
  const lines = git('worktree', 'list').split('\n')
  console.log(`${lines.length} worktree(s):\n`)
  for (const l of lines) {
    const dir = l.split(' ')[0]
    let note = ''
    try {
      const dirty = git('-C', dir, 'status', '--porcelain').split('\n').filter(Boolean).length
      note = dirty ? `${dirty} uncommitted` : 'clean'
    } catch { note = 'unreadable' }
    const nm = path.join(dir, 'Prut', 'web', 'node_modules')
    let deps = 'none'
    if (fs.existsSync(nm)) {
      deps = fs.lstatSync(nm).isSymbolicLink() ? '*** LINKED node_modules — CORRUPTION RISK ***' : 'own deps'
    }
    console.log(`  ${l}\n      ${note} · ${deps}`)
  }
}

else if (cmd === 'done') {
  assertSlug()
  const dir = wtPath(slug)
  if (!fs.existsSync(dir)) { console.error(`${dir} does not exist.`); process.exit(1) }
  const dirty = git('-C', dir, 'status', '--porcelain').split('\n').filter(Boolean)
  if (dirty.length) {
    console.error(`REFUSING: ${dirty.length} uncommitted change(s) in ${dir}:`)
    dirty.slice(0, 10).forEach((d) => console.error('   ' + d))
    console.error('Commit, push, or stash them first.')
    process.exit(1)
  }
  const unpushed = git('-C', dir, 'log', '--oneline', `origin/main..${branch(slug)}`)
  if (unpushed) {
    console.error(`REFUSING: ${branch(slug)} has commits not on origin/main:`)
    console.error(unpushed)
    console.error('Open a PR (or push) first — removing now would strand this work.')
    process.exit(1)
  }
  git('worktree', 'remove', '--force', dir)
  try { git('branch', '-D', branch(slug)) } catch {}
  git('worktree', 'prune')
  console.log(`✓ removed ${dir} and ${branch(slug)}`)
}

else {
  console.log('usage: agent-worktree.mjs <new|list|done> [slug]')
  process.exit(1)
}
