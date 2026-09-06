/**
 * Constraint-3 guard: renders shared fixtures through the LAST-PUBLISHED
 * dist (fetched via `npm pack`, so it needs network) and through HEAD's
 * source, and fails on any byte difference — output stability is a
 * feature, and a change to emitted SVG for an unchanged input must be a
 * deliberate, changelog-called-out event, never drift.
 *
 * Fixtures deliberately avoid constructs newer than the published version
 * (those are ALLOWED to differ; list them in EXPECTED_DIVERGENCE with the
 * changelog entry that licenses them). Run: `bun tools/byte-stability.ts`.
 * Not wired into prepublishOnly on purpose — it needs the network; run it
 * as part of the pre-tag review instead (release-doctor reports it).
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// maps using ONLY constructs the published version supports
const FIXTURES: Record<string, object> = {
  form: {
    wiring: [
      { tag: 'input', label: 'email', required: true, invalid: true, value: '⟷ a.email', bounds: { x: 10, y: 10, width: 160, height: 24 } },
      { tag: 'input', label: 'nickname', value: 'ada ⟷ a.nick', bounds: { x: 10, y: 50, width: 160, height: 24 } },
      { tag: 'button', text: 'submit', on: { click: 'a.go' }, bounds: { x: 10, y: 90, width: 80, height: 30 } },
    ],
  },
  sink: {
    wiring: [
      { tag: 'input', type: 'checkbox', checked: true, value: 'true ⟷ a.on', bounds: { x: 10, y: 10, width: 13, height: 13 } },
      { tag: 'input', type: 'radio', checked: true, label: 'medium', bounds: { x: 150, y: 10, width: 120, height: 24 } },
      { tag: 'input', placeholder: 'add a todo…', value: '⟷ a.newItem', bounds: { x: 410, y: 10, width: 120, height: 24 } },
      { tag: 'div', contentEditable: true, value: 'draft text', bounds: { x: 10, y: 90, width: 200, height: 60 } },
      { tag: 'ul', list: { path: 'a.items' }, bounds: { x: 300, y: 90, width: 200, height: 100 } },
      { tag: 'span', text: '3 ⟵ a.total', bounds: { x: 540, y: 10, width: 40, height: 24 } },
      { tag: 'p', text: 'the quick brown fox jumps over the lazy dog', bounds: { x: 10, y: 200, width: 200, height: 60 } },
      { tag: 'button', text: 'x', on: { click: 'a.del' }, ref: '@9', flags: [{ kind: 'contrast', label: '2.3:1', severity: 'error' }], bounds: { x: 10, y: 300, width: 18, height: 18 } },
    ],
  },
}

// fixture name → changelog entry licensing its divergence (none right now)
const EXPECTED_DIVERGENCE: Record<string, string> = {}

const dir = mkdtempSync(join(tmpdir(), 'floorplan-stability-'))
const pkg = (await import('../package.json')).default.name
Bun.spawnSync(['npm', 'pack', `${pkg}@latest`, '--silent', '--pack-destination', dir])
const tarball = [...new Bun.Glob('*.tgz').scanSync(dir)][0]
Bun.spawnSync(['tar', 'xzf', join(dir, tarball), '-C', dir])

const published = await import(join(dir, 'package', 'dist', 'index.js'))
const head = await import('../src/index.ts')

let failed = false
for (const [name, map] of Object.entries(FIXTURES)) {
  const before = published.schematicSVG(map)
  const after = head.schematicSVG(map)
  if (before === after) {
    console.log(`✅ ${name}: byte-identical to published ${tarball.replace('.tgz', '')}`)
  } else if (EXPECTED_DIVERGENCE[name]) {
    console.log(`⚠️  ${name}: differs — licensed by "${EXPECTED_DIVERGENCE[name]}"`)
  } else {
    failed = true
    let at = 0
    while (before[at] === after[at]) at++
    console.log(`❌ ${name}: UNLICENSED divergence at byte ${at}:`)
    console.log(`   published: …${before.slice(Math.max(0, at - 40), at + 40)}…`)
    console.log(`   HEAD:      …${after.slice(Math.max(0, at - 40), at + 40)}…`)
  }
}
if (failed) {
  console.log(
    '\nOutput changed for an unchanged input. Either revert the drift, or ' +
      'call the change out in CHANGELOG.md and license it in ' +
      'EXPECTED_DIVERGENCE — never ship it silently (CLAUDE.md constraint 3).'
  )
  process.exit(1)
}
