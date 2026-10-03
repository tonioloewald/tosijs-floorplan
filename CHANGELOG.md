# Changelog

All notable changes to **tosijs-floorplan** (formerly **tosijs-schematic**)
are documented here
([Keep a Changelog](https://keepachangelog.com/en/1.1.0/), semver).

## [Unreleased]

A narrow hardening patch. The pre-tag review blocked two broader cuts of
these fixes (reviews/0.5.2-patch-review*.md); this release ships only what
is sound, and says below what stays open.

### Fixed

- **A non-string `style` value no longer denies the whole map** (board
  #2748, present in 0.5.0 and earlier). A record whose `style` (or its
  `background`/`borderColor`/`color`) wasn't a string reached the escaper
  and threw, so `schematic()` failed for every record. Such a value now
  draws as if absent. A fuzz test covers every record field × seven wrong
  types (number, object, array, null, boolean, function, symbol) on a
  labelled button.

### Security

- **An `<image>` draws only the `data:` URI that was checked** (0.5.2
  review). `image` is now read once. Before, a getter answering `data:` to
  the check could get an external URL drawn as the `href`, so inlining or
  rasterizing the SVG fetched it.
- **Bounds, `within`, `pad`, `fontSize` and style colours are read once**
  (board #2753), so a getter or Proxy can't pass their check and print
  markup. Shown on 0.5.1 code: `viewportFixed` bounds `x`/`y`, and
  `within.y`/`within.height` through the legend footer. A record listed
  twice in the wiring is drawn from one snapshot of its bounds. The
  target-size rule judges the same snapshot, without rebuilding the
  record, so class-backed and inherited records keep their verdict.
- **`esc()` refuses non-strings** (anything else escapes to `''`). This is
  defence in depth: for plain-data input no call site passes a
  non-string. For in-process getters that change between reads (flag
  `kind`/`label`, still open, #2829), it is the last line that keeps an
  object with its own `replaceAll` out of the SVG.

JSON-sourced records were never exposed to the read-once holes.

### Not fixed in this release (tracked)

These need the record-snapshot redesign (board #2829), not more
field-by-field patches:
- Other fields are still read more than once, so the read-once guarantee
  covers only the fields listed above. That includes flag `kind`/`label`.
- A wrong-type value from an **in-process** producer can still throw in
  some branches and deny the map. Examples: a symbol `tag` or `label`, a
  null-prototype `label`/`ref`, or a flag getter that turns into a
  non-string. JSON can't express any of these.

The README's attribute guarantee stays scoped to plain-data input.

### Measured

- `dist/index.js`: 18,505 → 19,706 bytes (+1,201, +6.5%); gzip -9 5,579 →
  5,918 (+339). Cost: the style guard, the read-once snapshots and their
  comments.
- A 2,000-record map renders in about 13 ms, down from 18 ms in 0.5.1
  (release machine, built bundles). The container scan now reads each
  box's snapshot from an array in a plain loop. The first read-once cut
  had made it about 2× slower (0.5.2 review M2).

**tosijs pins this package exactly (`0.5.0`)**, so it needs a pin bump to
0.5.2 to get this release, 0.5.1's #2739 fix included.

## [0.5.1] - 2026-10-02

### Security

- **Geometry fails closed** (board #2739, found by this release's pre-tag
  review; present in 0.5.0 and earlier). Coordinates are written into SVG
  attributes, and a value of the wrong type could inject markup. On a
  `viewportFixed` record, a string `x`/`y` skipped every arithmetic check
  and was written verbatim into `x="…"`/`y="…"`, so `'1" onmouseover="…'`
  added an attribute and a hostile `y` could add a forged `<text>`,
  defeating the `secret` and forged-glyph guarantees. The `pad` and
  `fontSize` options and `within` reached the viewBox, `font-size` and the
  pinned offsets the same way. Now:
  - **Records** are untrusted producer data. A record whose `bounds` has
    any field that isn't a finite number (NaN, Infinity, any string, even
    `'10'`) is **not drawn**.
  - **Options of the declared type are untouched.** Any number (including
    NaN and ±Infinity), `null` or an absent option draws byte-identically
    to 0.5.0. `bun run stability` pins this over a grid: 5 numeric options,
    plus `within`'s 4 fields, × 12 edge values × 2 fixtures, 216 runs.
  - Only the options that print are guarded, and only against the wrong
    type: a `pad` or `fontSize` that isn't a number primitive (a string,
    even `'12'`; a boolean; an array; any object, `Number` wrappers
    included) is its default, and a `within` with such a field draws an empty map,
    rather than the whole one. These are the only option values whose
    output changes. In 0.5.0, strings concatenated into the geometry
    (`fontSize + 2` → `'122'`); `true` and wrappers drew as numbers.
    `maxCaption`, `minLabelHeight` and
    `targetSize` never reach an attribute and keep 0.5.0's arithmetic
    (`targetSize: '44'` is still 44).

  `decorate` plugin output is raw SVG and stays the plugin's
  responsibility. Both producers emit numeric bounds (tosijs `describe()`
  `Math.round`s a `DOMRect`; haltija reads `DOMRect` fields). **tosijs
  vendors this file, but pins `tosijs-floorplan` exactly (`0.5.0`)**, so
  `bun update` does not deliver this fix. tosijs picks it up when it bumps
  the pin to 0.5.1 and re-vendors.

### Verdict changes — same input, different answer

No input of the declared type changes any verdict. These inputs that
broke their declared types do:

- **Records with non-finite or string `bounds`** (`x: '10'`, NaN,
  Infinity) are no longer drawn, so they no longer get a legend entry or
  an `undersized` verdict from `schematic()`. In 0.5.0 they drew with
  broken geometry, and an Infinity coordinate made the whole map
  unrenderable. `isInteractive` and `targetSizeFinding` are unchanged, so
  called directly on such a record, `targetSizeFinding` still answers (a
  string `'18'` coerces), while the map no longer draws it.
- **A `within` with any field that isn't a number primitive** (`'0'`,
  `true`, an array, an object, a `Number` wrapper) draws an empty map. So
  every record under it loses its legend entry, including `undersized`.
  0.5.0 coerced most of these. Nothing yet tells a caller "bad region"
  from "empty region" (board #2744).
- **A `fontSize` that isn't a number primitive** now uses 11. Besides the
  drawing, that moves records in and out of the legend: a box is cramped
  below `fontSize × 3` wide, so with `fontSize: '12'`, a 34 px-wide box
  was cramped (legend) in 0.5.0 and draws its caption now.

### Measured

- `dist/index.js`: 17,970 → 18,505 bytes (+535, +3.0%); gzip 5,433 → 5,568
  (+135). Cost: the input guards (#2739). Measured with `gzip -9`
  against the published 0.5.0 tarball.

### Fixed

- **Doc comment on `secret` cited a tosijs version that never shipped**
  (#16): "tosijs 1.11.0" was renumbered to 1.10.2 before release. The
  vendored comment now says "tosijs' secret regions" (cannot go stale);
  the 0.5.0 entry below is corrected to 1.10.2. Comment-only — no emitted
  SVG or verdict changes.
- **The tarball no longer ships `src/schematic.test.ts`**: `files` names
  `src/index.ts` (the file tosijs vendors) instead of all of `src/`. The
  test file's relative import could not resolve from the package, which
  release-doctor flagged. `files` also excludes `dist/.*`, so a dotfile in
  a local `dist/` (macOS dropped a Spotlight marker there) can't ship.
  dist/ is unchanged.

### Changed

- Publishing moves to the shared OIDC + npm staged-publish workflow
  (`.github/workflows/publish.yml`): CI stages each release and the owner
  approves it with 2FA. Bun is pinned in `.bun-version` (1.4.2).

## [0.5.0] - 2026-09-12

The adoption-feedback release: all nine issues from tosijs 1.10.2's
adoption of 0.4.0 (#7–#15), landed as one batch. The predicates now
reproduce an audit's verdicts without consumer-side normalization,
retiring tosijs's private `auditView` workaround (#13).

### Verdict changes — same input, different answer (the section #14 asked for)

- **List-bound elements with their own evidence are affordances** (#7): a
  `<select>` carrying `list` *and* a two-way `value` (or handlers, or
  assertions) is no longer ground — `isInteractive` true, drawn solid,
  audited. Plain list containers without evidence are unchanged.
- **`targetSizeFinding` ignores producer flags by default** (#8):
  supersession is a drawing concern; `schematic()` opts in with
  `honorProducerFlags: true`. Direct callers of the rule now get the
  geometry verdict where they previously got `null` on flag-bearing
  records.
- **Supersession requires a target-claim kind** (#8): exported
  `TARGET_FLAG_KINDS` (`target`, `target-size`, `targetsize`,
  `target_size`, `smalltarget` — case-insensitive) replaces the substring
  match that let `target-ok` stand the audit down. Covers both producers'
  kinds in the wild.
- **Zero-size records are never undersized** (#9): hidden is not small;
  the guard callers were each rewriting is folded into the rule.
- **The blind-map note respects capability evidence** (#10): any handler,
  assertion, or provenance arrow in a bindable field anywhere in the map —
  display-only `⟵` included — suppresses it. A read-only dashboard from a
  binding framework no longer gets told to assert fields its producer
  never emits.

### Added

- **`secret` record field + `redacted` legend fact, FAIL-CLOSED** (#15,
  from tosijs 1.10.2's secret regions; hardened by this release's review
  G1, which caught the first cut fail-open — republishing a magic-link
  token while stamping `redacted: true` beside the leak — and whose
  round-2 B1 caught the scrub missing `image`, the captured pixels being
  the highest-bandwidth withholdable fact): a secret record's
  label/text/value/placeholder/href/image never reach the drawing or
  the legend, even when a producer bug leaves them in the record, and
  any *truthy* `secret` scrubs — fail-closed means malformed producer
  JSON errs toward withholding. It
  draws `<tag> [withheld]` and its legend entry says `redacted: true`,
  structural records included. "No destination" and "destination
  withheld" are different facts.
- **`TARGET_FLAG_KINDS` exported**; `targetSizeFinding` gains the
  `honorProducerFlags` option (#8/#13).

### Fixed

- **Malformed `flags` entries no longer throw anywhere** (#12 + review
  R2): a kind-less entry draws `data-flag=""`, and `flags: [null]` or a
  non-string `label` no longer take down the render — every field of a
  flags entry now has the defence `severity` got first.

### Measured

- `dist/index.js`: 16,925 → 17,964 bytes (+1,039, ~+6%) — the named
  0.5.0 features; the stability harness now prints this delta every run,
  since the source lands verbatim inside tosijs's bundle.

### Documented

- The forged-arrow residual now names the open-key-set limit explicitly
  (#11): the never-scanned list is a denylist, bound props ride under
  arbitrary keys, so producer-side neutralization remains the perimeter —
  narrowed, not closed.
- Verdict changes are a first-class CHANGELOG section by convention (#14),
  recorded in CLAUDE.md.

## [0.4.0] - 2026-09-06

The producer-parity release: everything here came from the two consumers
reading 0.3.0 closely — tosijs's 1.8.0 review (#4, #5) and haltija's
validation against DOM-derived records (#2, #3).

### Added — the producer's word counts

- **`interactive` / `editable` record fields** (#2, #3): the producer's
  *assertion* of affordance, for producers that cannot introspect handlers
  (React delegates at a root; vanilla `addEventListener` is not enumerable
  from page script). Asserting is truth-telling; fabricating `on` to unlock
  the styling would be a lie in the payload. tosijs never needs them.
- **`isInteractive` and `targetSizeFinding` exported** (#4): tosijs's audit
  and this renderer had drifted into contradictory verdicts on the same
  element; now there is one implementation, living where the geometry lives.
- **`schematic().note` + `<desc>` confession** (#3): when a map draws
  affordance-shaped boxes but *no* record carries any affordance evidence,
  the result says so — "nothing here is actionable" and "the producer
  couldn't tell" are different statements, and silence was claiming the
  first.

### Changed — emitted SVG changes for some unchanged inputs (deliberate)

- **A destination is an affordance**: `href` now makes a record actable
  (bold outline) and interactive (target-size audit) — a link navigates,
  handlers or no. Previously a plain `<a href>` drew as inert (#3, #4).
- **The inline exception narrows** (#2): a link is text-size-exempt only
  when it has text *and* its box is wider than tall — the shape text layout
  produces. The old text-only rule exempted a 16×16 icon link the moment it
  carried a glyph or one-word label: exactly the header-row-of-icon-links
  case the check was built for. Square icon links now flag, labelled or not.
- Maps with **none** of the new constructs (no bare-href links, no forged
  arrows, no assertions, at least one evidence-bearing record) render
  **byte-identical to 0.3.0** — verified against the published 0.3.0 dist
  over form and kitchen-sink fixtures.

### Fixed — a forged arrow confers nothing (hardened post-review)

- **The pre-release review BLOCKed the first cut of this defense and was
  right** (`reviews/0.4.0-producer-parity.md`, B1 — confirmed by execution):
  neutralization originally covered only the `text`/`value` caption paths,
  so an arrow in `label`, `placeholder`, `href` or any extra prop still
  conferred the ↔ badge, `isInteractive`, and put the raw glyph in a
  caption run. Remediated: **every** caption source neutralizes at one
  choke point; the binding scan skips never-bindable identity/name fields
  (`tag`/`id`/`part`/`role`/`label`/`placeholder`/`type`/`description`/
  `href`/`ref`/`image`); the legend's display fields (`caption`, `value`)
  receive neutralized values, while `href` and `flags` are verbatim by
  design — a URL's bytes are the destination (spec'd, with the consumer
  obligation); the renderer's internal affordance logic and the exported
  predicates share one implementation by construction. Captions containing
  arrow tokens in the newly-covered fields render neutralized — an output
  change for affected inputs, deliberate.
- **The residual is confessed, not hidden** (review M1): a forged arrow in
  *suffix* position on a bindable field is indistinguishable from a real
  binding by construction. The README spec now makes producer-side
  neutralization **MUST** for untrusted-content producers, and the limit is
  pinned by test. Malformed flag `severity` values can no longer reach up
  the prototype chain into a fill attribute, and the drawn flag *label* run
  neutralizes arrow tokens too (round-2 review; output changes only for
  arrow-bearing flag labels, which no known producer emits — the legend's
  copy of `flags` stays verbatim, as the spec states).
- **Provenance parsing splits at the LAST arrow** (#5, from tosijs's SEC-8):
  the structural arrow is the one the surface appends — always last — so a
  `⟷` buried inside data no longer truncates the shown value, and (worse,
  before) no longer dressed a non-interactive element in the `↔` badge and
  bold outline: a drawing that lies about what the page can do. Interior
  arrow tokens are neutralized (`<->` / `<-`) so the rare glyph never rides
  a caption run. The README now specifies last-occurrence parsing for all
  consumers, matching tosijs ≥ 1.8.0's producer-side neutralization.

## [0.3.0] - 2026-08-09

### Renamed — tosijs-schematic → tosijs-floorplan

The old name near-collided with **tosijs-schema** (the JSON-schema
validation library) and confused readers in practice. Renamed while the
mental debt was small: before any external consumer shipped a dependency
(haltija adopts at its 1.13; tosijs vendors the source file). 0.3.0 is the
first release under the new name; `tosijs-schematic` is deprecated on npm
at 0.2.0 with a pointer here. **Exported API names are unchanged**
(`schematic()`, `schematicSVG()`, `SchematicRecord`, …) — the drawing is
still a schematic in the common-noun sense, and the record format is a
multi-producer contract mid-adoption.

### Added — small elements stop lying by omission

- **`schematic(description, options)` → `{ svg, legend }`** — the renderer's
  primary form. The legend carries what the drawing could not legibly hold,
  keyed by index/ref. `schematicSVG()` remains as `schematic().svg`.
- **Cramped records draw bare** (below `minLabelHeight` tall or `3×fontSize`
  wide): shape, state geometry, emphasis and focus still draw; caption, `↔`
  badge, flags and the required `*` move to the legend — and the record is
  **auto-stamped** with its index/ref as the pointer. Toggles keep their
  external labels (they never competed for interior space).
- **Target-size audit**: interactive elements (handlers, two-way bindings,
  contenteditable) below `targetSize` on either axis draw one amber
  `data-flag="target-size"` bar and a measured legend fact
  (`"18×18 — below 24×24 (WCAG 2.5.8)"`). Default 24 (the AA floor);
  set 44/48 for the platform touch bar; 0 disables. Checkboxes/radios are
  exempt as user-agent-sized controls.
- **The image confesses**: when the legend is non-empty the svg carries a
  machine-readable `<desc>` and a visible 14px footer strip ("N elements
  with details in legend — match by stamped number"). Maps with nothing
  elided are byte-identical to 0.2.0 output.
- Truncated captions (`…`) place their full text in the legend; the invalid
  corner-flag now shrinks to fit tiny boxes.

### Added — href and value find their home (issue #1, haltija's request)

- **`href?: string`** — a link's destination, distinct from its text
  ("says X" is not "goes to Y"). Captions fall back to it only when nothing
  else names the element (the nameless-sidebar case); it *always* rides the
  legend — URLs are the facts most often too long to draw.
- **`value?: string`** — a filled control's value as a declared field
  (tosijs already carried it as a bound prop; plain-DOM producers now have
  the same home). A cramped or truncated control's held value lands in its
  legend entry, provenance stripped.

### Changed — the target-size audit learns the inline exception

- A link **with text** is presumed sized by its text and exempt from the
  built-in audit (WCAG 2.5.8's inline exception, approximated as far as
  pure geometry allows — flagging prose links fires on every paragraph and
  the check gets ignored). Icon links (no text) stay flagged.
- A producer-supplied flag whose `kind` mentions `target` **supersedes**
  the built-in audit — producers with DOM access compute the exception
  properly; no double amber bars for one finding.

### Fixed

- Fully-wrapped multi-line captions were falsely reported truncated (the
  per-line character count lost the break spaces), forcing a stamp and a
  legend entry onto every wrapped paragraph.

## [0.2.0] - 2026-08-08

### Added — the haltija convergence (issue #1)

- **`ref`** — a durable, actionable handle from the producer; takes the
  index slot when present, rides the group as `data-ref`.
- **`flags`** — computed verdicts (`{kind, label, severity?}[]`) drawn as
  severity-colored bars on the left edge; first flag's label shown.
- **`image`** — data-URL media drawn in place (non-data URLs refused).
- **Caption wrapping** — captions use the height the box affords; truncate
  (with `…`) only when geometry runs out. Single-line output byte-identical
  to 0.1.x.

## [0.1.1] - 2026-08-07

### Fixed

- `SchematicDescription` dropped its index signature (TS gives implicit
  index signatures to literals, never interfaces) so interface-typed
  producers — tosijs's `AgentDescription` — assign without casts.

## [0.1.0] - 2026-08-07

Initial extraction from tosijs's one-user-interface branch: `schematicSVG`,
`rasterizeSVG`, `boundsOf`, the record format, the affordance grammar, the
`decorate` seam. All 21 tosijs schematic tests ported, passing
byte-identical.
