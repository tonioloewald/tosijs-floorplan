# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A **micro-library**: the floorplan renderer for agent-surface maps, extracted
from tosijs's *one user interface* work. One source file, one test file, a
README that doubles as the **record-format specification**. It is deliberately
boring: no doc site, no CI apparatus, no framework. Keep it that way until an
external plugin gallery genuinely demands more.

**Named `tosijs-floorplan` since 0.3.0** (formerly `tosijs-schematic`,
deprecated on npm at 0.2.0 — the near-collision with `tosijs-schema`
confused readers in practice). The **exported API keeps the schematic-\***
names deliberately: it is a multi-producer contract mid-adoption. Do not
"finish" the rename by renaming exports.

## Commands

```bash
bun test           # the whole suite (pure fixtures, no DOM needed)
bun run build      # bun build (ESM) + tsc declarations into dist/
npm publish        # prepublishOnly runs tests + build; publish is manual
```

## Hard constraints — read before changing anything

1. **Zero runtime dependencies, no DOM in the core.** `schematicSVG` is a pure
   function over plain records. `rasterizeSVG`/`boundsOf` are the only
   browser-touching exports and must stay feature-detected. Never add a
   dependency; never import anything.

2. **tosijs VENDORS `src/index.ts` verbatim.** tosijs (the framework) takes
   this package as a devDependency and its build regenerates
   `tosijs/src/schematic.ts` from `node_modules/tosijs-floorplan/src/index.ts`
   (path updates with tosijs's adoption of the rename; check their
   `vendorSchematic()` in `bin/site.ts` — issue filed on the rename). That
   means: `src/` ships in the npm tarball on purpose (`files` field); the
   source must remain a **single self-contained file**; and anything you
   change here lands inside tosijs's bundle on its next `bun update` +
   rebuild. tosijs stays zero-runtime-dependency *because* of this
   arrangement — do not convert it to an import.

3. **Output stability is a feature, not an accident.** tosijs commits its
   built `dist/` and `docs/` to git, and consumers may snapshot-test SVG
   output. 0.2.0 explicitly promised single-line caption output byte-identical
   to 0.1.x. Treat any change to emitted SVG for an *unchanged* input as a
   semver-minor event at least, called out in the commit message, with the
   affected tests updated deliberately — never as incidental drift.

4. **The record format is a multi-producer contract — not this repo's to
   change unilaterally.** Producers: tosijs's `describe()` (the reference
   producer) and haltija's DOM extraction (adopting as of its 1.13 — see
   issue #1, the convergence that validated the format: 145 records rendered
   first try). Field semantics changes need an issue and producer sign-off
   first. Additive optional fields are fine; renames and meaning-changes are
   breaking regardless of what semver says.

## The grammar's laws (each was paid for)

- **Geometry over glyphs.** One exotic character (⟷, U+27F7) tofu'd entire
  caption runs under resvg — rasterizers resolve fonts per text run. That's
  why toggle state is drawn (✕ / dot), the editable badge is ↔ (U+2194,
  near-universal) isolated in its own text element, and everything else is
  ASCII. Never put a rare glyph inside a caption run.
- **Hints are not content.** `placeholder` is a separate field from `label`
  and renders italic — an empty input must never read as filled. Both
  producers reached this independently; it is settled.
- **Ground is not figure.** Structure (and list *containers*) draw faint
  dotted; solid reads as actionable. Disabled beats bold.
- **The slot map is fully allocated**: top-left = invalid flag, top-right =
  ref/index (white backdrop), bottom-right = ↔ badge, left edge = flags
  (verdict bars), outline = focus ring/emphasis, interior = state geometry +
  embedded media. New per-record visuals go through `decorate` (the
  EXPERIMENTAL plugin seam) until a real slot API exists — the first real
  third-party plugin is intended to shape that API; don't design it in a
  vacuum.

## Ecosystem practices

This repo follows the shared conventions in `../tosijs-coding-practices`
(read it; contribute lessons back). The ones that bite here: **file, don't
fix** (problems in tosijs/haltija get an issue on their repo, mirrored in
their UPSTREAM.md — never a drive-by edit); commits carry receipts (what was
verified, how); knowledge sinks to the lowest layer that holds it — if a
lesson is about the *format*, it belongs in the README spec, not in a
comment.

## Related repos (siblings in ../)

- `tosijs` — reference producer AND vendor-consumer (see constraint 2).
- `haltija` — second producer (DOM extraction: geometry, contrast, stable
  refs, media). Its convergence feedback drove 0.2.0 (`ref`, `flags`,
  `image`, caption wrapping).
- `tosijs-schema` — **different package**: JSON-schema validation. The
  near-collision in names is acknowledged in the README.
- `tosijs-coding-practices` — the shared practices KB.
