# tosijs-schematic

Render an **agent-surface map** — plain records describing a UI's wired
elements — as a schematic SVG: one shape per element at its true geometry,
wearing an explicit **affordance grammar** so "can I act here?" never needs
guessing.

It is a **pure function over plain data**. No DOM, no framework, no
dependencies. The map travels as JSON, so the renderer runs in the page, in
a headless embodiment, in a test harness, or on the far side of a wire from
an app nobody is viewing.

> **Not [tosijs-schema](https://github.com/tonioloewald/tosijs-schema)!**
> That's the JSON-schema validation library. The near-collision is honest
> cross-fertilization rather than carelessness: schemas become *contracts*,
> contracts ride the *map*, and the map is what this package draws.

## Install

```
npm add tosijs-schematic
```

## Quick start

With [tosijs](https://tosijs.net), the map draws itself — `describe()`
output is already the record format:

```js
import { enableAgentInterface } from 'tosijs'
import { schematicSVG } from 'tosijs-schematic'

const agent = enableAgentInterface()
const svg = schematicSVG(agent.describe({ styles: true }))
```

Without tosijs, emit records yourself — anything that produces them gets
the renderer and the grammar:

```js
import { schematicSVG } from 'tosijs-schematic'

const svg = schematicSVG({
  wiring: [
    {
      tag: 'input',
      label: 'quantity',
      value: '3 ⟷ app.qty',
      bounds: { x: 10, y: 10, width: 160, height: 24 },
    },
    {
      tag: 'button',
      text: 'submit',
      on: { click: 'app.submit' },
      bounds: { x: 180, y: 10, width: 80, height: 24 },
    },
  ],
})
```

## The record format (the contract)

One flat record per wired element. Producers may add fields beyond these —
**bound props ride under their own keys** as `"value ⟷ path"` strings.

| field | type | meaning |
| --- | --- | --- |
| `tag` | `string` | lowercase tag name (required) |
| `ref` | `string` | a durable, actionable handle from the producer (survives re-renders — an agent can *act* on it, where an index only *looks up*) |
| `flags` | `{kind, label, severity?}[]` | computed verdicts about the element (contrast ratios, target sizes, …) |
| `image` | `string` | data-URL snapshot of inline media, drawn in place — pixels a pure renderer can't obtain |
| `bounds` | `{x, y, width, height}` | page-coordinate geometry — layout is part of the semantics; zero-size or absent = not drawn |
| `label` | `string` | the accessible **name** (aria-label, resolved labelledby, `<label>` association, title, alt) |
| `placeholder` | `string` | the hint — deliberately distinct from `label`: an empty input must never read as content |
| `text` | `string` | textContent, static (`"foo"`) or bound (`"foo ⟵ path"`) |
| `href` | `string` | a link's destination — distinct from `text` ("the link *says* X" is not "the link *goes to* Y"). Captions fall back to it only when nothing else names the element; it always rides the **legend** |
| `value` | `string` | a filled control's value, distinct from `label`/`placeholder` — static (`"3"`) or bound (`"3 ⟷ app.qty"`); the fact that distinguishes an empty form from a filled one |
| `type` | `string` | input kind when not plain text (`checkbox`, `radio`, `range`, `email`, …) |
| `checked` | `boolean` | live toggle state |
| `focused` | `boolean` | holds keyboard focus right now |
| `invalid` | `boolean` | live ValidityState (or aria-invalid) says invalid |
| `required` | `boolean` | the field is required |
| `disabled` | `boolean` | disabled right now |
| `contentEditable` | `boolean` | an editable region — treated as an input field |
| `on` | `Record<string, string \| string[]>` | handlers by event type — a path when nameable, `ƒ` (or `ƒ name`) when not |
| `list` | `{path, idPath?}` | this element renders a collection (drawn as *ground*, not figure) |
| `structural` | `boolean` | structure, not affordance (headings, landmarks, containers) |
| `viewportFixed` | `boolean` | rides the viewport (fixed/sticky) — bounds are screen coordinates |
| `style` | `{background, borderColor, color}` | computed colors, worn when present |
| `id`, `part`, `role`, `description` | `string` | identity and explanation, passed through to consumers |

**Provenance tokens** (exported as `BOUND_TO_DOM` / `BOUND_TWO_WAY`): a bound
value reads `"<shown> <arrow> <path>"` — `⟵` means state flows to the DOM
(display), `⟷` means two-way (a user-writable affordance). A plain string
with no arrow is a live-but-unbound value.

**The picture is not the whole payload.** The renderer is *allowed to omit*:
captions and badges below legibility thresholds move to the legend, keyed by
the stamped index/ref, and facts that never draw well (`href` above all)
live there always. A consumer of the raster is expected to hold
`schematic().legend` alongside it — the image says *where* and *which*; the
legend says *what*.

## The grammar

Every rule is **geometry or ASCII** — hard-won: a single exotic glyph can
tofu an entire caption run under a rasterizer, and text glyphs are mush at
checkbox sizes.

| you see | it means |
| --- | --- |
| **bold outline** | wired to act (has handlers) |
| `↔` badge, bottom-right | editable here (two-way binding, or contenteditable) |
| caption ending `*` | required |
| **red corner flag**, top-left | invalid *right now* — live ValidityState, the same truth `:invalid` styles |
| `✕` filling a box / dot in a circle | checkbox / radio state, live |
| *italic caption* | placeholder hint — **not** content |
| faded | disabled right now (beats bold: a disabled button is not an affordance) |
| double outline | keyboard focus — where the user is |
| faint dotted | structure — including list *containers* (their items are the affordances) |
| number, top-right, on a white backdrop | the record's index (`index: true`) — the raster form of `data-record`: read it off the image, look up `wiring[n]` |
| a `ref` (e.g. `@42`), top-right | the producer's **durable, actionable handle** — takes the index slot when present, survives re-renders, rides the group as `data-ref` |
| colored bars, left edge | computed **verdicts** (`flags`): WCAG contrast failures and friends — error red, warn amber, info gray, first flag's label shown |
| pixels inside a box | embedded media (`image`: a data URL) — the producer's snapshot of inline `<svg>`/`<canvas>`, drawn in place |
| a bare box wearing only a stamped number | too small to label legibly — its caption, badges and flags live in the **legend**, matched by that number |
| single amber bar, left edge | an interactive element below `targetSize` (default 24×24, WCAG 2.5.8; set 44/48 for the touch-target bar) — a usability defect in its own right; the measurement is in the legend |
| footer strip: "N elements with details in legend" | the image's confession that it isn't the whole map — fetch `schematic().legend` (a machine-readable `<desc>` says the same) |

The target-size audit honours WCAG 2.5.8's **inline exception** as far as
pure geometry can: a link *with text* is presumed sized by its text and is
exempt (flagging prose links would fire on every paragraph — a check that
cries wolf gets ignored, taking the real findings with it). An icon link —
an `<a>` wrapping an `<svg>`, no text — stays flagged. A producer with DOM
access can compute the exception *properly* (computed display + parent text
nodes) and ship the finding via `flags`; a producer flag whose `kind`
mentions `target` **supersedes** the built-in audit, so the two never
double-mark.

Captions tell the truth in priority order: a held **value** wins (as
`label: value` when both are known), an empty control falls back to its
*hint*, then label, then text. Containers holding other drawn boxes get no
text-derived caption — their children speak. Captions **wrap** when the box
affords more than one line — a paragraph that wraps on the real page has
the same vertical room here — and only truncate (with `…`) when the
geometry genuinely runs out.

## API

| export | what |
| --- | --- |
| `schematic(description, options?)` | the renderer's primary form — returns `{ svg, legend }`: the drawing plus the metadata it could not legibly carry (cramped/truncated/undersized records), keyed by index/ref. **Pair every raster with its legend.** |
| `schematicSVG(description, options?)` | `schematic().svg` — the string-only form; each `<g>` carries `data-record="<i>"` linking back to `description.wiring[i]` (the image as index) |
| `rasterizeSVG(svg, {scale})` | SVG → PNG Blob for vision encoders (browser canvas; under bun/node use `@resvg/resvg-js` — rasterize at 2× so labels OCR cleanly) |
| `boundsOf(element)` | an element's page-coordinate bounds — the natural `within` argument |
| `BOUND_TO_DOM`, `BOUND_TWO_WAY` | the provenance tokens |

**Options**: `pad`, `minLabelHeight`, `maxCaption`, `fontSize`; `within`
(a page-coordinate rect — spatial scoping: the viewBox *is* the region);
`index: true` (stamp record indexes); `targetSize` (the undersized-audit
floor: 24 default, 44/48 for touch, 0 off); `legendNote: false` (suppress
the footer strip); `decorate` (below).

## Plugins (EXPERIMENTAL)

`decorate` is the extension seam: called once per drawn record, just before
its `<g>` closes, with the record, its resolved geometry, and an `emit`
function. The corner slots already spoken for: **top-left** invalid flag,
**top-right** index, **bottom-right** `↔` badge, **outline** focus/emphasis.
Claim empty real estate:

```js
schematicSVG(map, {
  decorate({ record, x, y, width, emit }) {
    if (record.style && contrastRatio(record.style) < 4.5) {
      emit(`<text x="${x + width / 2}" y="${y - 2}" font-size="6"
        text-anchor="middle">contrast!</text>`)
    }
  },
})
```

The first real plugins will shape the successor API — if you build one,
open an issue.

## Provenance

Extracted from the [tosijs](https://tosijs.net) *one user interface* work:
one source of truth for state, UI, and AI, where the agent's map derives
from what the framework already knows. The grammar here was debugged
against real rasterizers and real assistive-tech semantics — see the tosijs
docs for the living demos (a todo list whose map redraws itself, and a
kitchen-sink truth page).

## License

Apache-2.0
