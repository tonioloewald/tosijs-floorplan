# tosijs-floorplan

Render an **agent-surface map** — plain records describing a UI's wired
elements — as a floorplan SVG: one shape per element at its true geometry,
wearing an explicit **affordance grammar** so "can I act here?" never needs
guessing. Like a floorplan of a building, it documents a *real, live*
structure — where the doors are, which ones open.

It is a **pure function over plain data**. No DOM, no framework, no
dependencies. The map travels as JSON, so the renderer runs in the page, in
a headless embodiment, in a test harness, or on the far side of a wire from
an app nobody is viewing.

> **Formerly `tosijs-schematic`** (deprecated on npm at 0.2.0; renamed
> before its first external consumer shipped). The old name near-collided
> with [tosijs-schema](https://github.com/tonioloewald/tosijs-schema), the
> JSON-schema validation library, and confused readers in practice — an
> honest hazard of real cross-fertilization: schemas become *contracts*,
> contracts ride the *map*, and the map is what this package draws. The
> **exported API keeps its names** (`schematic()`, `SchematicRecord`, …):
> the drawing is still a schematic in the common-noun sense, and the record
> format is a multi-producer contract mid-adoption.

## Install

```
npm add tosijs-floorplan
```

## Quick start

With [tosijs](https://tosijs.net), the map draws itself — `describe()`
output is already the record format:

```js
import { enableAgentInterface } from 'tosijs'
import { schematicSVG } from 'tosijs-floorplan'

const agent = enableAgentInterface()
const svg = schematicSVG(agent.describe({ styles: true }))
```

Without tosijs, emit records yourself — anything that produces them gets
the renderer and the grammar:

```js
import { schematicSVG } from 'tosijs-floorplan'

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
| `interactive` | `boolean` | the producer's **assertion** that this element can be acted on — for producers that cannot introspect handlers (React delegates at a root; vanilla `addEventListener` is not enumerable from page script). Asserting is truth-telling; fabricating `on` to unlock the styling would be a lie in the payload. A binding framework never needs it |
| `editable` | `boolean` | the producer's assertion that text goes in here — the DOM-side counterpart of `contentEditable` / a two-way binding |
| `secret` | `boolean` | the producer **withheld** facts about this element (a secret-marked region: a token lives in the destination, so neither `label` nor `href` is published). **Fail-closed on the renderer side**: a secret record's label/text/value/placeholder/href/**image** never reach the drawing or the legend even if a producer bug leaves them in the record, and any truthy `secret` scrubs (malformed errs toward withholding) — it draws `<tag> [withheld]` and its legend entry says `redacted: true` (structural records included) — "no destination" and "destination withheld" are different facts |
| `on` | `Record<string, string \| string[]>` | handlers by event type — a path when nameable, `ƒ` (or `ƒ name`) when not |
| `list` | `{path, idPath?}` | this element renders a collection (drawn as *ground*, not figure) |
| `structural` | `boolean` | structure, not affordance (headings, landmarks, containers) |
| `viewportFixed` | `boolean` | rides the viewport (fixed/sticky) — bounds are screen coordinates |
| `style` | `{background, borderColor, color}` | computed colors, worn when present |
| `id`, `part`, `role`, `description` | `string` | identity and explanation, passed through to consumers |

**Provenance tokens** (exported as `BOUND_TO_DOM` / `BOUND_TWO_WAY`): a bound
value reads `"<shown> <arrow> <path>"` — `⟵` means state flows to the DOM
(display), `⟷` means two-way (a user-writable affordance). A plain string
with no arrow is a live-but-unbound value. The **structural arrow is the
LAST one in the string** — the surface appends it, so consumers must split
at the last occurrence, and an arrow token buried inside the data confers
nothing (the renderer parses defensively: it neutralizes interior arrows to
`<->` / `<-` in every drawn text run and in the legend's *display* fields —
`caption` and `value` are always neutralized — and never scans
identity/name fields (`tag`, `id`, `part`, `role`, `label`, `placeholder`,
`type`, `description`, `href`, `ref`, `image`) for bindings at all, since
the surface never appends an arrow to those). Two legend fields are
**verbatim, deliberately**: `href` is an opaque destination — rewriting
bytes inside a URL corrupts the one fact an agent acts on — and `flags`
are copied as the producer computed them. Consumers must never parse
provenance from either (they are in the never-scanned set; an arrow there
is data), and must not forward them into a caption-style text run without
neutralizing first. **Producers whose record
content derives from untrusted sources — any DOM extractor reading page
content — MUST neutralize both tokens inside data at the source**, as
tosijs ≥ 1.8.0 does. This is normative because of an honest residual: a
forged arrow in *suffix* position on a bindable field (`"data ⟷ fake.path"`
as the entire text) is structurally indistinguishable from a real binding —
renderer-side defense ends where the format's own syntax begins. And the
bindable set is **open by design** (bound props ride under their own keys),
so the never-scanned list is a denylist over an open key set: any key a
producer invents is bindable, and arrows in it are trusted as structure.
The defense is narrowed, not closed — producer-side neutralization remains
the actual perimeter (issue #11). The capability scan (below) likewise
counts an arrow in **any position** within a bindable field: under the
format's own last-occurrence parse, "contains an arrow" and "has a
structural arrow" are equivalent for a lone token, so a position check
would add no security — only the #11 perimeter does.

**Producers that cannot introspect handlers** (React's synthetic delegation,
Angular's compiler output, vanilla `addEventListener` — none enumerable from
page script) assert the affordance instead: `interactive` / `editable`, per
record. When a map draws affordance-shaped boxes but **no** record carries
affordance evidence (no `on`, `href`, `contentEditable`, two-way binding, or
assertion) **and none carries capability evidence either** — a handler, an
assertion, or a provenance arrow in a bindable field *anywhere in the map*,
display-only `⟵` included, proves the producer can see wiring (#10: a
read-only dashboard from a binding framework is a sighted map of an inert
page, not a blind map) — the result carries a `note`, and the svg's
`<desc>` repeats it,
because "nothing here is actionable" and "the producer couldn't tell" are
different statements, and a consumer must never mistake the second for the
first. Two caveats pin the semantics: **partial evidence does not establish
the rest** — on a map where some records carry evidence, a record without
any still means *unknown*, not *inert* (the note only marks the total-blindness
case; non-introspecting producers should assert per actable record, not rely
on the note); and **only `interactive: true` / `editable: true` are signal** —
`false` is indistinguishable from absent and cannot veto evidence the record
itself carries (`on`, `href`, a binding). "Introspected and found nothing"
currently has no encoding; propose one via issue before relying on it.

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
| **bold outline** | wired to act — handlers, a destination (`href`: a link IS an affordance), or the producer's `interactive` assertion |
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
pure geometry can: a link is exempt when it has text **and its box is wider
than tall** — the shape text layout produces (flagging prose links would
fire on every paragraph — a check that cries wolf gets ignored, taking the
real findings with it). Icon links stay flagged: an `<a>` wrapping an
`<svg>` with no text, and equally a **square** icon link that happens to
carry a label or a glyph — a 16×16 box was not sized by its text, whatever
the text is (the text-only rule exempted exactly the header-row-of-icons
case the check was built for; haltija's issue #2 caught it). A producer
with DOM access computes the exception *properly* (computed display +
parent text nodes) and ships the finding via `flags` — that is the
**intended path** for DOM producers. A producer flag whose `kind` is one
of the **target-claim kinds** (`TARGET_FLAG_KINDS`, case-insensitive:
`target`, `target-size`, `targetsize`, `target_size`, `smalltarget`)
**supersedes** the drawn audit, so the two never double-mark — an explicit
set, because a substring match let `target-ok` stand the audit down (#8);
new target-claim kinds are added to `TARGET_FLAG_KINDS` via an issue here,
the same additive path as any other format change, and the set is
read-only by contract.
Supersession is a *drawing* concern and therefore **opt-in**:
`targetSizeFinding` ignores producer flags by default (an audit wants the
geometry verdict regardless of what got drawn); `schematic()` passes
`honorProducerFlags: true`. Hidden is not small: zero-size records are
never undersized (#9). Both rules are exported (`isInteractive`,
`targetSizeFinding`) so audits share this implementation instead of
keeping a drifting copy — and as of 0.5.0 they reproduce an audit's
verdicts without consumer-side normalization (#7/#8/#9/#13).

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
| `schematic(description, options?)` | the renderer's primary form — returns `{ svg, legend, note? }`: the drawing, the metadata it could not legibly carry (cramped/truncated/undersized records, keyed by index/ref), and — when no record carries affordance evidence — the note saying so. **Pair every raster with its legend.** |
| `schematicSVG(description, options?)` | `schematic().svg` — the string-only form; each `<g>` carries `data-record="<i>"` linking back to `description.wiring[i]` (the image as index) |
| `isInteractive(record)` | "can I act here?" — the single implementation (handlers, `href`, `contentEditable`, a structural two-way binding, or the producer's assertion; ground never). Exported so audits consume it instead of keeping a drifting copy |
| `targetSizeFinding(record, targetSize?, {honorProducerFlags?})` | the WCAG 2.5.8 rule with the settled exemptions (toggles, text-sized links, zero-size; producer-flag supersession only when honoured — the renderer's setting, not an audit's) — the measured legend fact, or `null` |
| `TARGET_FLAG_KINDS` | the flag kinds that claim to *be* a target-size finding and may supersede the drawn audit |
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
