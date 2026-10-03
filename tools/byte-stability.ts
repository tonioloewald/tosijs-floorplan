/**
 * Constraint-3 guard: renders shared fixtures through the LAST-PUBLISHED
 * dist (fetched via `npm pack`, so it needs network) and through HEAD's
 * source, and fails on any byte difference — output stability is a
 * feature, and a change to emitted SVG for an unchanged input must be a
 * deliberate, changelog-called-out event, never drift.
 *
 * Fixtures deliberately avoid constructs newer than the published version
 * (those are ALLOWED to differ; list them in EXPECTED_DIVERGENCE with the
 * changelog entry that licenses them).
 *
 * WIRING: `bun run stability` — a MANDATORY pre-tag step, listed in
 * CLAUDE.md's commands. It is NOT in prepublishOnly (it needs the network)
 * and NOTHING runs it automatically — release-doctor has no project-local
 * preflight seam (asking for one is virta board #2588); until that
 * exists, the human/agent cutting the tag runs this by hand.
 */
import { mkdtempSync, rmSync, statSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'
import { judge } from './stability-judge'

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
  // shapes whose VERDICT deliberately changed in 0.5.0 — byte pins for
  // the new verdicts since 0.5.0 published (their 0.4.0-divergence
  // licenses self-expired then)
  'verdict-list-select': {
    wiring: [
      { tag: 'select', list: { path: 'app.options', idPath: 'id' }, value: 'b ⟷ app.choice', bounds: { x: 10, y: 10, width: 20, height: 20 } },
    ],
  },
  'verdict-target-ok-flag': {
    wiring: [
      { tag: 'button', text: 'go', on: { click: 'f' }, flags: [{ kind: 'target-ok', label: 'fine' }], bounds: { x: 10, y: 10, width: 10, height: 10 } },
    ],
  },
  'verdict-capability-map': {
    wiring: [
      { tag: 'span', text: '21C ⟵ dash.temp', bounds: { x: 10, y: 10, width: 160, height: 24 } },
    ],
  },
  'verdict-secret-withheld': {
    wiring: [
      // the fail-closed scrub path itself (G1 + round-2 B1): every
      // withholdable fact present, none may survive into the bytes
      { tag: 'a', secret: true, href: '/magic?token=X', label: 'leak', text: 'leaky text', value: 'X', placeholder: 'p', image: 'data:image/gif;base64,AAAA', on: { click: 'f' }, bounds: { x: 10, y: 10, width: 160, height: 24 } },
    ],
  },
}

// fixture name → the PUBLISHED VERSION it is licensed to diverge from,
// plus the changelog entry licensing it. Version-keyed so licenses
// SELF-EXPIRE (round-3 review): once the change publishes, the fetched
// tarball's version no longer matches divergesFrom, the license reads as
// stale, and the fixture becomes a byte pin — an armed license can never
// excuse the next drift.
const EXPECTED_DIVERGENCE: Record<string, { divergesFrom: string; reason: string }> = {
  // (empty since 0.5.0 published — its four verdict-change licenses
  // self-expired on first post-publish run and the fixtures now pin bytes)
}

// pinned furniture (a viewportFixed nav) + a cramped flow box, so the
// pinned-offset sink (minX + pad, #2739's own vector) and the legend
// footer are both in every comparison (board #2754)
FIXTURES.pinned = {
  wiring: [
    { tag: 'nav', text: 'menu', on: { click: 'app.menu' }, viewportFixed: true, bounds: { x: 0, y: 0, width: 120, height: 24 } },
    { tag: 'button', text: 'tiny', on: { click: 'app.go' }, bounds: { x: 40, y: 60, width: 30, height: 9 } },
    { tag: 'input', label: 'name', value: 'x ⟷ app.name', bounds: { x: 40, y: 90, width: 160, height: 28 } },
  ],
}

// styled records (the #2748 path) and an uncramped flagged record (the
// inline flag bar), in shapes 0.5.1 already supported (board 0.5.2 F2)
FIXTURES.styled = {
  wiring: [
    { tag: 'input', type: 'radio', checked: true, value: 'a ⟷ app.pick', style: { background: 'rgb(250, 250, 250)', borderColor: 'rgb(0, 0, 0)', color: 'rgb(20, 20, 20)' }, bounds: { x: 10, y: 10, width: 16, height: 16 } },
    { tag: 'section', structural: true, style: { background: 'rgb(240, 240, 255)', borderColor: 'rgb(0, 0, 255)', color: 'black' }, bounds: { x: 0, y: 40, width: 300, height: 120 } },
    { tag: 'button', text: 'save', on: { click: 'app.save' }, style: { background: 'white', borderColor: 'rgba(0, 0, 0, 0)', color: 'navy' }, bounds: { x: 20, y: 60, width: 90, height: 32 } },
    { tag: 'a', href: '/help', text: 'help', image: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=', flags: [{ kind: 'contrast', label: '2.9:1', severity: 'warn' }], bounds: { x: 130, y: 60, width: 120, height: 40 } },
    { tag: 'input', label: 'qty', placeholder: 'how many', value: '3 ⟷ app.qty', required: true, invalid: true, bounds: { x: 20, y: 110, width: 160, height: 30 } },
  ],
}

// options of the DECLARED type must draw byte-identically to the published
// release — every option × every edge a number can take (plus null and
// absent), and the pairs that meet in the same sink (within × pad: the
// viewBox and the pinned offsets). A grid, not hand-picked cases: rounds 2-4
// of the 0.5.1 review each found a value a hand-picked list missed.
const EDGES: unknown[] = [0, -1, 1, 7.5, 44, 1e308, -1e308, NaN, Infinity, -Infinity, null, undefined]
const OPTIONS = ['pad', 'minLabelHeight', 'maxCaption', 'fontSize', 'targetSize']
const GRID_FIXTURES = ['form', 'sink', 'pinned', 'styled']

// RECORD FIELDS: since 0.5.2 every record is snapshotted (readRecord), and
// primitives must keep 0.5.1's semantics exactly, coercions included. Every
// field × primitive values, on each record shape in the styled fixture,
// compared on the whole result AND on the exported predicates (the verdict
// surface, constraint 3 / #14). A case where the published release THREW is
// skipped (counted): throwing there is the bug 0.5.2 fixes.
const PRIMITIVES: unknown[] = [5, 0, -1, true, false, '', 'x', 'a ⟷ app.b', null, undefined]
const RECORD_FIELDS = [
  'tag', 'id', 'part', 'role', 'label', 'placeholder', 'type', 'checked', 'focused',
  'invalid', 'required', 'disabled', 'contentEditable', 'description', 'text', 'on',
  'list', 'viewportFixed', 'structural', 'style', 'ref', 'flags', 'image', 'href',
  'value', 'interactive', 'editable', 'secret', 'custom',
]

const runs = (): [string, object, object | undefined][] => {
  const runs: [string, object, object | undefined][] = Object.entries(FIXTURES).map(
    ([name, map]) => [name, map, undefined]
  )
  const grid: [string, object][] = []
  for (const option of OPTIONS)
    for (const edge of EDGES) grid.push([`${option}: ${String(edge)}`, { [option]: edge }])
  for (const field of ['x', 'y', 'width', 'height'])
    for (const edge of EDGES)
      grid.push([`within.${field}: ${String(edge)}`, { within: { x: 0, y: 0, width: 300, height: 400, [field]: edge } }])
  for (const edge of EDGES)
    for (const padEdge of EDGES)
      grid.push([
        `within.x: ${String(edge)} × pad: ${String(padEdge)}`,
        { within: { x: edge, y: 0, width: 300, height: 400 }, pad: padEdge },
      ])
  for (const fixture of GRID_FIXTURES)
    for (const [name, options] of grid) runs.push([`${fixture} + ${name}`, FIXTURES[fixture], options])
  return runs
}

// everything schematic() returns is output (CLAUDE.md constraint 3: the
// legend carries the verdicts and the undersized text), so compare it all
const render = (lib: any, map: object, options: object | undefined): string =>
  JSON.stringify(lib.schematic(map, options))

const verdicts = (lib: any, map: any): string => {
  try {
    return JSON.stringify([
      lib.schematic(map),
      map.wiring.map((r: any) => [
        lib.isInteractive(r),
        lib.targetSizeFinding(r),
        lib.targetSizeFinding(r, 44, { honorProducerFlags: true }),
      ]),
    ])
  } catch (e) {
    return `THREW ${(e as Error).constructor.name}`
  }
}

const main = async (dir: string): Promise<number> => {
  console.log(`working in ${dir}`)
  const pkg = (await import('../package.json')).default.name
  const packed = Bun.spawnSync(['npm', 'pack', `${pkg}@latest`, '--silent', '--pack-destination', dir])
  const tarball = [...new Bun.Glob('*.tgz').scanSync(dir)][0]
  if (packed.exitCode !== 0 || tarball == null) {
    // a precondition failure is NOT a stability failure — say which it is
    console.log(
      `⏭️  could not fetch ${pkg}@latest (offline? registry down?) — ` +
        'stability is UNVERIFIED, not passed; re-run online before tagging'
    )
    return 1
  }
  const untarred = Bun.spawnSync(['tar', 'xzf', join(dir, tarball), '-C', dir])
  if (untarred.exitCode !== 0) {
    console.log(`⏭️  could not unpack ${tarball} — stability is UNVERIFIED, not passed`)
    return 1
  }
  const publishedName = tarball.replace('.tgz', '')
  const publishedDist = join(dir, 'package', 'dist', 'index.js')
  const published = await import(publishedDist)
  const head = await import('../src/index.ts')

  // bundle-size delta, built fresh from HEAD (never a stale local dist/):
  // the source lands verbatim inside tosijs's bundle (constraint 2), so
  // growth is a consumer-visible fact — name it in the CHANGELOG
  const built = Bun.spawnSync(['bun', 'build', 'src/index.ts', '--outdir', join(dir, 'head'), '--format', 'esm'])
  if (built.exitCode === 0) {
    const size = (file: string) => {
      const bytes = readFileSync(file)
      return { raw: statSync(file).size, gz: gzipSync(bytes, { level: 9 }).length }
    }
    const was = size(publishedDist)
    const now = size(join(dir, 'head', 'index.js'))
    const delta = (a: number, b: number) => `${b - a >= 0 ? '+' : ''}${b - a}`
    console.log(
      `dist/index.js: ${publishedName} ${was.raw} B (${was.gz} gz) → HEAD ${now.raw} B ` +
        `(${now.gz} gz): ${delta(was.raw, now.raw)} B, ${delta(was.gz, now.gz)} gz` +
        (now.raw > was.raw ? ' — the bundle GREW: say so in the CHANGELOG (### Measured)' : '')
    )
  } else {
    console.log('⏭️  could not build HEAD for the size delta — size UNMEASURED')
  }

  let failed = false
  let gridRuns = 0
  let gridPassed = 0
  for (const [name, map, options] of runs()) {
    const { verdict, message } = judge(
      name,
      render(published, map, options),
      render(head, map, options),
      EXPECTED_DIVERGENCE[name],
      publishedName
    )
    if (verdict === 'stale' || verdict === 'drift') failed = true
    if (options === undefined) console.log(message)
    else {
      gridRuns++
      if (verdict === 'identical') gridPassed++
      else console.log(message)
    }
  }
  console.log(
    `${gridPassed === gridRuns ? '✅' : '❌'} option grid: ${gridPassed}/${gridRuns} identical ` +
      `(svg + legend + note) over ${GRID_FIXTURES.join(', ')}`
  )

  let fieldRuns = 0
  let fieldPassed = 0
  let fieldSkipped = 0
  const shapes = (FIXTURES.styled as any).wiring
  for (let at = 0; at < shapes.length; at++)
    for (const field of RECORD_FIELDS)
      for (const value of PRIMITIVES) {
        const wiring = shapes.map((r: any, i: number) => (i === at ? { ...r, [field]: value } : r))
        const map = { ...FIXTURES.styled, wiring }
        const before = verdicts(published, map)
        if (before.startsWith('THREW')) {
          fieldSkipped++
          continue
        }
        fieldRuns++
        const name = `styled[${at}].${field} = ${JSON.stringify(value) ?? 'undefined'}`
        const { verdict, message } = judge(name, before, verdicts(head, map), undefined, publishedName)
        if (verdict === 'identical') fieldPassed++
        else {
          failed = true
          console.log(message)
        }
      }
  console.log(
    `${fieldPassed === fieldRuns ? '✅' : '❌'} record-field grid: ${fieldPassed}/${fieldRuns} identical ` +
      `(result + isInteractive + targetSizeFinding); ${fieldSkipped} skipped where ${publishedName} threw`
  )
  if (failed) {
    console.log(
      '\nOutput changed for an unchanged input. Either revert the drift, or ' +
        'call the change out in CHANGELOG.md and license it in ' +
        'EXPECTED_DIVERGENCE — never ship it silently (CLAUDE.md constraint 3).'
    )
    return 1
  }
  return 0
}

// the temp dir goes on EVERY exit path (board #2754: process.exit used to
// skip the cleanup on each failure)
const dir = mkdtempSync(join(tmpdir(), 'floorplan-stability-'))
let code = 1
try {
  code = await main(dir)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
process.exit(code)
