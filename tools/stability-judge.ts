/**
 * The byte-stability verdict for one run, as a pure function so the
 * license logic is testable without the network (board #2584). The tool
 * (tools/byte-stability.ts) fetches the published release and renders;
 * this decides what the two outputs mean.
 */
export interface License {
  /** the PUBLISHED version this fixture is licensed to diverge from */
  divergesFrom: string
  /** the changelog entry licensing it */
  reason: string
}

export type Verdict = 'identical' | 'licensed' | 'stale' | 'drift'

export const judge = (
  name: string,
  before: string,
  after: string,
  license: License | undefined,
  published: string
): { verdict: Verdict; message: string } => {
  // version mismatch = the licensed change has published: the license is
  // STALE whether or not bytes currently differ, and a stale license must
  // never excuse drift (0.5.0 round-3 review: an identical-bytes-only check
  // fired exactly when there was nothing to catch)
  if (license != null && license.divergesFrom !== published) {
    return {
      verdict: 'stale',
      message:
        `❌ ${name}: license is STALE (diverges from ${license.divergesFrom}, ` +
        `published is ${published}) — delete its EXPECTED_DIVERGENCE ` +
        'entry so this fixture pins bytes again' +
        (before === after
          ? ' (bytes currently identical)'
          : ' (bytes DIFFER — investigate before deleting)'),
    }
  }
  if (before === after) {
    return { verdict: 'identical', message: `✅ ${name}: byte-identical to published ${published}` }
  }
  if (license != null) {
    return { verdict: 'licensed', message: `⚠️  ${name}: differs — licensed by "${license.reason}"` }
  }
  let at = 0
  while (before[at] === after[at]) at++
  return {
    verdict: 'drift',
    message:
      `❌ ${name}: UNLICENSED divergence at byte ${at}:\n` +
      `   published: …${before.slice(Math.max(0, at - 40), at + 40)}…\n` +
      `   HEAD:      …${after.slice(Math.max(0, at - 40), at + 40)}…`,
  }
}
