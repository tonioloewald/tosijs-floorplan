# Changelog

All notable changes to **tosijs-schematic** are documented here
([Keep a Changelog](https://keepachangelog.com/en/1.1.0/), semver).

## [0.3.0] - 2026-08-09

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
