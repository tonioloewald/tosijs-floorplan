import { test, expect, describe } from 'bun:test'
import { schematicSVG, schematic, isInteractive, targetSizeFinding } from './index'
import { SchematicDescription } from './index'

const description: SchematicDescription = {
  exposure: 'introspection',
  roots: { app: 'object' },
  actions: ['app.restock'],
  wiring: [
    {
      tag: 'input',
      label: 'filter stock…',
      value: 'milk ⟷ app.filter',
      bounds: { x: 10, y: 20, width: 200, height: 30 },
      style: {
        background: 'rgb(255, 255, 255)',
        borderColor: 'rgb(128, 128, 128)',
        color: 'rgb(17, 17, 17)',
      },
    },
    {
      tag: 'span',
      text: '3 ⟵ app.total',
      bounds: { x: 220, y: 20, width: 40, height: 30 },
    },
    {
      // hidden: zero-size — must not be drawn
      tag: 'div',
      text: 'invisible',
      bounds: { x: 0, y: 0, width: 0, height: 0 },
    },
    {
      tag: 'button',
      text: 'a & "b" <c>',
      on: { click: 'app.restock' },
      bounds: { x: 10, y: 60, width: 80, height: 8 }, // too short for a caption
    },
  ],
}

describe('schematicSVG — pure, DOM-free rendering of the map', () => {
  test('draws visible wired elements at their true geometry', () => {
    const svg = schematicSVG(description)
    expect(svg.startsWith('<svg xmlns=')).toBe(true)
    expect(svg).toContain('<rect x="10" y="20" width="200" height="30"')
    expect(svg).toContain('<rect x="220" y="20" width="40" height="30"')
    // the input HOLDS a value — name and value both speak: "label: value" —
    // and editability is a SEPARATE right-edge ↔ badge (rasterizer-safe)
    expect(svg).toContain('filter stock…: milk</text>')
    expect(svg).toContain('>↔</text>')
  })

  test('root svg carries explicit width/height (intrinsic size; Firefox canvas-draw requires it)', () => {
    const svg = schematicSVG(description)
    // bbox: x 10-260 (+8 pad both sides), y 20-68 (+8 both sides) — PLUS
    // the 14px legend footer: the 8px button is cramped (its caption lives
    // in the legend), and the image must confess that
    expect(svg).toContain('width="266"')
    expect(svg).toContain('height="78"')
    expect(svg).toContain('details in legend')
  })

  test('zero-size records (hidden elements) are not drawn', () => {
    const svg = schematicSVG(description)
    expect(svg).not.toContain('invisible')
    expect(svg).not.toContain('width="0"')
  })

  test('cramped records: bare box, auto stamp, metadata in the legend', () => {
    const { svg, legend } = schematic(description)
    // the 8px button (record 3): no caption drawn, but STAMPED unbidden
    expect(svg).toContain('data-index-backdrop')
    expect(svg).toContain('>3</text>')
    const entry = legend.find((e) => e.index === 3)!
    expect(entry).toBeDefined()
    expect(entry.caption).toBe('a & "b" <c>') // unescaped truth, for JSON
    expect(entry.tag).toBe('button')
    // machine-readable confession rides the svg itself
    expect(svg).toContain('<desc>')
    expect(svg).toContain('pair this image with its legend JSON')
  })

  test('nothing elided = no footer, no desc, byte-stable output', () => {
    const roomy: SchematicDescription = {
      wiring: [
        {
          tag: 'input',
          label: 'name',
          value: 'ada ⟷ a.name',
          bounds: { x: 10, y: 10, width: 200, height: 30 },
        },
      ],
    }
    const { svg, legend } = schematic(roomy)
    expect(legend).toEqual([])
    expect(svg).not.toContain('<desc>')
    expect(svg).not.toContain('details in legend')
    expect(svg).toBe(schematicSVG(roomy))
  })

  test('undersized interactive elements: amber bar + measured legend fact; toggles exempt', () => {
    const tiny: SchematicDescription = {
      wiring: [
        {
          tag: 'button',
          text: 'x',
          on: { click: 'app.del' },
          bounds: { x: 10, y: 10, width: 18, height: 18 },
        },
        {
          tag: 'input',
          type: 'checkbox',
          checked: true,
          value: 'true ⟷ a.on',
          bounds: { x: 40, y: 10, width: 13, height: 13 },
        },
        {
          tag: 'span',
          text: 'ok',
          bounds: { x: 60, y: 10, width: 18, height: 18 },
        },
      ],
    }
    const { svg, legend } = schematic(tiny)
    expect(svg).toContain('data-flag="target-size"')
    const bar = legend.find((e) => e.undersized != null)!
    expect(bar.index).toBe(0)
    expect(bar.undersized).toBe('18×18 — below 24×24 (WCAG 2.5.8)')
    // the checkbox (user-agent-sized) and the inert span are NOT flagged
    expect(legend.filter((e) => e.undersized != null).length).toBe(1)
    // raising the bar to the platform touch standard is one option away
    const strict = schematic(tiny, { targetSize: 44 })
    expect(strict.legend.find((e) => e.index === 0)!.undersized).toContain('44×44')
    // and 0 disables the audit
    expect(schematic(tiny, { targetSize: 0 }).legend.filter((e) => e.undersized).length).toBe(0)
  })

  test('truncated captions land whole in the legend', () => {
    const longText =
      'a caption far too long for the box it lives in, which keeps going'
    const { legend } = schematic({
      wiring: [
        { tag: 'span', text: longText, bounds: { x: 0, y: 0, width: 80, height: 20 } },
      ],
    })
    expect(legend.length).toBe(1)
    expect(legend[0].caption).toBe(longText)
  })

  test('each group indexes back into description.wiring — the image as index', () => {
    const svg = schematicSVG(description)
    expect(svg).toContain('data-record="0"')
    expect(svg).toContain('data-record="1"')
    expect(svg).toContain('data-record="3"')
    expect(svg).not.toContain('data-record="2"') // the hidden one
  })

  test('styles are worn when present, defaults when not', () => {
    const svg = schematicSVG(description)
    expect(svg).toContain('fill="rgb(255, 255, 255)"')
    expect(svg).toContain('stroke="rgb(128, 128, 128)"')
    expect(svg).toContain('stroke="currentColor"') // the unstyled span
  })

  test('captions are XML-escaped and short boxes get none', () => {
    const svg = schematicSVG(description)
    // the button box is 8px tall — below minLabelHeight — so its caption
    // (which contains XML-hostile characters) must be absent entirely
    expect(svg).not.toContain('a &amp; &quot;b&quot;')
    const tall = schematicSVG(description, { minLabelHeight: 4 })
    expect(tall).toContain('a &amp; &quot;b&quot; &lt;c&gt;')
  })

  test('empty map renders an empty svg rather than throwing', () => {
    const svg = schematicSVG({
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [],
    })
    expect(svg).toContain('<svg')
  })
})

describe('spatial scoping — within', () => {
  test('within keeps intersecting records and the viewBox IS the region', () => {
    const region = { x: 0, y: 0, width: 300, height: 60 }
    const svg = schematicSVG(description, { within: region })
    // input (10,20 200x30) and span (220,20 40x30) intersect; button at y60
    // height 8 touches the edge? y:60 vs region 0..60 — 60 < 60 false → excluded
    expect(svg).toContain('data-record="0"')
    expect(svg).toContain('data-record="1"')
    expect(svg).not.toContain('data-record="3"')
    // viewBox is the region (padded by default 8)
    expect(svg).toContain('viewBox="-8 -8 316 76"')
  })

  test('a region intersecting nothing yields the empty svg', () => {
    const svg = schematicSVG(description, {
      within: { x: 5000, y: 5000, width: 10, height: 10 },
    })
    expect(svg).toContain('viewBox="0 0 0 0"')
  })
})

describe('containment-aware captions', () => {
  test('a container box gets no text-derived caption — its children speak', () => {
    const nested: SchematicDescription = {
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [
        {
          tag: 'ul',
          text: 'alpha beta', // concatenated child text — must NOT render
          bounds: { x: 0, y: 0, width: 200, height: 100 },
        },
        {
          tag: 'span',
          text: 'alpha',
          bounds: { x: 10, y: 10, width: 80, height: 20 },
        },
        {
          tag: 'span',
          text: 'beta',
          bounds: { x: 10, y: 40, width: 80, height: 20 },
        },
      ],
    }
    const svg = schematicSVG(nested)
    expect(svg).not.toContain('alpha beta')
    expect(svg).toContain('>alpha</text>')
    expect(svg).toContain('>beta</text>')
  })

  test('a container with an explicit label keeps it', () => {
    const labeled: SchematicDescription = {
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [
        {
          tag: 'ul',
          label: 'todo list',
          text: 'alpha',
          bounds: { x: 0, y: 0, width: 200, height: 100 },
        },
        {
          tag: 'span',
          text: 'alpha',
          bounds: { x: 10, y: 10, width: 80, height: 20 },
        },
      ],
    }
    const svg = schematicSVG(labeled)
    expect(svg).toContain('todo list')
  })
})

describe('viewport-fixed furniture', () => {
  test('pinned records neither stretch the viewBox nor sit mid-document', () => {
    const withChrome: SchematicDescription = {
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [
        {
          tag: 'input',
          text: 'content',
          bounds: { x: 100, y: 5000, width: 200, height: 30 },
        },
        {
          tag: 'nav',
          label: 'site nav',
          viewportFixed: true,
          bounds: { x: 0, y: 0, width: 180, height: 400 },
        },
      ],
    }
    const svg = schematicSVG(withChrome)
    // viewBox fits the FLOW content only (y around 5000), not the nav
    expect(svg).toContain('viewBox="92 4992 216 46"')
    // the nav is pinned at the map origin (min + pad), not at page 0,0
    expect(svg).toContain('<rect x="100" y="5000"')
  })
})

describe('off-page hiding', () => {
  test('fully negative-coordinate records are excluded — hidden is hidden', () => {
    const stashed: SchematicDescription = {
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [
        {
          tag: 'input',
          text: 'visible',
          bounds: { x: 10, y: 10, width: 100, height: 30 },
        },
        {
          tag: 'button',
          text: 'stashed off-page',
          bounds: { x: 400, y: -1358, width: 90, height: 36 },
        },
      ],
    }
    const svg = schematicSVG(stashed)
    expect(svg).not.toContain('stashed off-page')
    expect(svg).toContain('viewBox="2 2 116 46"') // fits the visible box only
  })
})

describe('the affordance grammar — actionable is explicit', () => {
  test('handler-wired elements get a bold outline; editable boxes wear the badge', () => {
    const grammar: SchematicDescription = {
      exposure: 'introspection',
      roots: {},
      actions: [],
      wiring: [
        {
          tag: 'input',
          label: 'add a todo…', // label hides the bound-value arrow…
          value: ' ⟷ app.newItem',
          bounds: { x: 0, y: 0, width: 200, height: 30 },
        },
        {
          tag: 'button',
          text: 'add',
          on: { click: 'app.addItem' },
          bounds: { x: 210, y: 0, width: 60, height: 30 },
        },
        {
          tag: 'span',
          text: '3 ⟵ app.total', // display-only: no bold, no suffix
          bounds: { x: 280, y: 0, width: 40, height: 30 },
        },
      ],
    }
    const svg = schematicSVG(grammar)
    // …so the ↔ badge carries it: editable is explicit, and isolated in its
    // own text run so a font missing it can only tofu the badge itself
    expect(svg).toContain('add a todo…</text>')
    expect(svg).toContain('>↔</text>')
    expect(svg).not.toContain('⟷</text>') // the rare glyph never rides a caption
    // the wired button is BOLD; the display-only span is not
    expect(svg).toContain('x="210" y="0" width="60" height="30" fill="transparent" stroke="currentColor" stroke-width="2"')
    expect(svg).toContain('x="280" y="0" width="40" height="30" fill="transparent" stroke="currentColor"/>')
  })
})

// ---------------------------------------------------------------------------
// the kitchen-sink truths: control state must RENDER, hints must not read as
// content, and the raster can carry its own legend
describe('schematicSVG — control-state truth', () => {
  const bounds = (x: number) => ({ x, y: 10, width: 120, height: 24 })
  const sink: any = {
    roots: {},
    actions: [],
    exposure: 'introspection',
    wiring: [
      // checkbox: checked and not — the state is the caption
      { tag: 'input', type: 'checkbox', checked: true, value: 'true ⟷ a.on', bounds: { x: 10, y: 10, width: 13, height: 13 } },
      { tag: 'input', type: 'checkbox', checked: false, bounds: { x: 30, y: 10, width: 13, height: 13 } },
      // radios
      { tag: 'input', type: 'radio', checked: true, label: 'medium', bounds: bounds(150) },
      { tag: 'input', type: 'radio', checked: false, label: 'large', bounds: bounds(280) },
      // empty input with placeholder: an italic HINT, not content
      { tag: 'input', placeholder: 'add a todo…', value: '⟷ a.newItem', bounds: bounds(410) },
      // input with BOTH: the value wins
      { tag: 'input', placeholder: 'search…', value: 'milk ⟷ a.filter', bounds: bounds(540) },
      // unbound input harvested live (plain string, no arrow)
      { tag: 'input', value: 'typed by hand', bounds: bounds(670) },
    ],
  }

  test('toggle state is GEOMETRY: ✕ in the checked box, dot in the checked radio', () => {
    const svg = schematicSVG(sink)
    // the checked checkbox draws an ✕ (two lines); the unchecked one none
    expect(svg.match(/<line /g)!.length).toBe(2)
    // radios are circles: two outlines, ONE filled dot (the checked one)
    expect(svg.match(/<circle /g)!.length).toBe(3)
    // toggle labels sit to the right of the control, not inside it
    expect(svg).toContain('>medium</text>')
    expect(svg).toContain('>large</text>')
    // the radio rows draw no <rect> boxes — the circle IS the control
    expect(svg).not.toContain('<rect x="150"')
  })

  test('placeholder renders as an italic hint; a held value beats it', () => {
    const svg = schematicSVG(sink)
    expect(svg).toContain('font-style="italic"')
    expect(svg).toContain('add a todo…')
    expect(svg).toContain('milk</text>')
    expect(svg).not.toContain('search…') // value present — hint suppressed
    expect(svg).toContain('typed by hand') // live unbound value surfaces
  })

  test('index: true stamps each box with its wiring index — image as legend', () => {
    const svg = schematicSVG(sink, { index: true })
    for (let i = 0; i < sink.wiring.length; i++) {
      expect(svg).toContain(`data-record="${i}"`)
    }
    // one backdropped digit per record (the ↔ badge also anchors end, so
    // count the backdrops — white, mostly opaque, always legible)
    expect(svg.match(/data-index-backdrop/g)!.length).toBe(sink.wiring.length)
  })
})

describe('focus — where the user is', () => {
  test('a focused record draws a second outline just outside its box', () => {
    const focusMap: any = {
      roots: {},
      actions: [],
      exposure: 'introspection',
      wiring: [
        {
          tag: 'input',
          focused: true,
          value: '⟷ a.q',
          bounds: { x: 10, y: 10, width: 100, height: 24 },
        },
        {
          tag: 'input',
          value: '⟷ a.r',
          bounds: { x: 10, y: 50, width: 100, height: 24 },
        },
      ],
    }
    const svg = schematicSVG(focusMap)
    // the ring: offset 2.5px out, 5px larger, unfilled
    expect(svg).toContain('<rect x="7.5" y="7.5" width="105" height="29"')
    // exactly one ring — the unfocused input gets none
    expect(svg.match(/stroke-width="1\.5"/g)!.length).toBe(1)
  })
})

describe('list containers are ground, not figure', () => {
  test('a list-bound container draws dotted like structure — its items act', () => {
    const listMap: any = {
      roots: {},
      actions: [],
      exposure: 'introspection',
      wiring: [
        {
          tag: 'ul',
          list: { path: 'app.items', idPath: 'id' },
          bounds: { x: 0, y: 0, width: 200, height: 100 },
        },
        {
          tag: 'input',
          type: 'checkbox',
          checked: true,
          value: 'true ⟷ app.items[id=1].done',
          bounds: { x: 10, y: 10, width: 13, height: 13 },
        },
      ],
    }
    const svg = schematicSVG(listMap)
    // the ul: dotted, unfilled — wired in the JSON, ground in the drawing
    expect(svg).toContain('stroke-dasharray="1 3"')
    expect(svg).toContain('fill="none"')
    // …but a container that also HANDLES events stays a solid affordance
    listMap.wiring[0].on = { click: 'app.select' }
    const svg2 = schematicSVG(listMap)
    expect(svg2).not.toContain('stroke-dasharray')
  })
})

describe('required and invalid — the form-truth grammar', () => {
  const formMap: any = {
    roots: {},
    actions: [],
    exposure: 'introspection',
    wiring: [
      {
        tag: 'input',
        label: 'email',
        required: true,
        invalid: true,
        value: '⟷ a.email',
        bounds: { x: 10, y: 10, width: 160, height: 24 },
      },
      {
        tag: 'input',
        label: 'nickname',
        value: 'ada ⟷ a.nick',
        bounds: { x: 10, y: 50, width: 160, height: 24 },
      },
    ],
  }

  test('required wears the asterisk; invalid wears the red corner flag', () => {
    const svg = schematicSVG(formMap)
    expect(svg).toContain('email *')
    expect(svg).toContain('fill="#d32f2f"')
    expect(svg).toContain(`<path d="M10 10 l7 0 l-7 7 z"`)
    // the valid field wears neither
    expect(svg).not.toContain('nickname: ada *')
    expect(svg.match(/#d32f2f/g)!.length).toBe(1)
  })
})

describe('contenteditable — drawn as an input', () => {
  test('value captions, hints italicize, and the ↔ badge appears unbid', () => {
    const map: any = {
      roots: {},
      actions: [],
      exposure: 'introspection',
      wiring: [
        {
          tag: 'div',
          contentEditable: true,
          value: 'draft text',
          bounds: { x: 10, y: 10, width: 200, height: 60 },
        },
        {
          tag: 'div',
          contentEditable: true,
          placeholder: 'jot something…',
          bounds: { x: 10, y: 90, width: 200, height: 60 },
        },
      ],
    }
    const svg = schematicSVG(map)
    expect(svg).toContain('draft text')
    expect(svg).toContain('jot something…')
    expect(svg).toContain('font-style="italic"')
    // editable-by-hand is a fact of the element — no binding required
    expect(svg.match(/>↔<\/text>/g)!.length).toBe(2)
  })
})

describe('decorate — the plugin seam', () => {
  test('runs per drawn record inside its group; skipped records never decorate', () => {
    const map: SchematicDescription = {
      wiring: [
        { tag: 'input', value: 'x ⟷ a.x', bounds: { x: 10, y: 10, width: 100, height: 24 } },
        { tag: 'div', text: 'hidden', bounds: { x: 0, y: 0, width: 0, height: 0 } },
      ],
    }
    const seen: number[] = []
    const svg = schematicSVG(map, {
      decorate({ record, index, x, y, width, emit }) {
        seen.push(index)
        // a contrast-annotation-shaped plugin: a note at the top edge
        emit(
          `<text x="${x + width - 2}" y="${y - 2}" font-size="6" ` +
            `text-anchor="end" data-plugin="note">${record.tag}</text>`
        )
      },
    })
    expect(seen).toEqual([0]) // the zero-size record was never drawn
    expect(svg).toContain('data-plugin="note"')
    // inside the record's group, before it closes
    expect(svg.indexOf('data-plugin')).toBeLessThan(svg.indexOf('</g>'))
  })
})

describe('producer compatibility — interface-typed maps assign without casts', () => {
  test("a describe()-shaped interface flows straight in", () => {
    // mirrors tosijs's AgentDescription: an INTERFACE (no implicit index
    // signature) with extra fields — must satisfy SchematicDescription
    interface ProducerShape {
      roots: Record<string, string>
      wiring: Array<{ tag: string; bounds?: { x: number; y: number; width: number; height: number }; [k: string]: unknown }>
      actions: string[]
      exposure: 'introspection' | 'manifest'
    }
    const map: ProducerShape = {
      roots: { app: 'object' },
      wiring: [{ tag: 'button', text: 'go', on: { click: 'app.go' }, bounds: { x: 0, y: 0, width: 40, height: 20 } }],
      actions: ['app.go'],
      exposure: 'introspection',
    }
    const svg = schematicSVG(map) // the assignment IS the assertion
    expect(svg).toContain('data-record="0"')
  })
})

describe('the haltija convergence — ref, flags, image, wrapping (0.2.0)', () => {
  const at = (x: number, y: number, width = 160, height = 24) => ({ x, y, width, height })

  test('ref: a durable handle takes the index slot and rides the group', () => {
    const map: SchematicDescription = {
      wiring: [
        { tag: 'button', text: 'go', ref: '@42', bounds: at(10, 10) },
        { tag: 'button', text: 'stop', bounds: at(10, 40) },
      ],
    }
    const svg = schematicSVG(map, { index: true })
    expect(svg).toContain('data-ref="@42"')
    expect(svg).toContain('>@42</text>') // rendered in preference to 0
    expect(svg).not.toContain('>0</text>')
    expect(svg).toContain('>1</text>') // no ref → the index, as before
    // a ref renders even without index: true — the producer asked for it
    const bare = schematicSVG(map)
    expect(bare).toContain('>@42</text>')
  })

  test('flags: severity bars on the left edge, first label shown', () => {
    const map: SchematicDescription = {
      wiring: [
        {
          tag: 'button',
          text: 'low contrast',
          flags: [
            { kind: 'contrast', label: '2.3:1', severity: 'error' },
            { kind: 'target-size', label: 'small', severity: 'warn' },
          ],
          bounds: at(10, 10),
        },
      ],
    }
    const svg = schematicSVG(map)
    expect(svg).toContain('data-flag="contrast"')
    expect(svg).toContain('data-flag="target-size"')
    expect(svg).toContain('fill="#d32f2f" data-flag') // error color
    expect(svg).toContain('fill="#e6a700" data-flag') // warn color
    expect(svg).toContain('>2.3:1</text>') // first flag's label
    expect(svg).not.toContain('>small</text>') // later labels stay quiet
  })

  test('image: a data-URL draws in place, behind the captions', () => {
    const px =
      'data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
    const map: SchematicDescription = {
      wiring: [
        { tag: 'canvas', label: 'starfield', image: px, bounds: at(10, 10, 200, 100) },
        { tag: 'img', text: 'no data', image: 'https://not-a-data-url', bounds: at(10, 120) },
      ],
    }
    const svg = schematicSVG(map)
    expect(svg).toContain(`href="${px}"`)
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"')
    expect(svg).not.toContain('not-a-data-url') // non-data URLs are refused
  })

  test('wrapping: captions use vertical room instead of truncating', () => {
    const longText =
      'the quick brown fox jumps over the lazy dog and keeps going for a while'
    const map: SchematicDescription = {
      wiring: [
        { tag: 'p', text: longText, bounds: at(10, 10, 300, 60) },
        { tag: 'span', text: longText, bounds: at(10, 90, 300, 20) },
      ],
    }
    const svg = schematicSVG(map)
    expect(svg).toContain('<tspan') // the tall box wraps
    expect(svg).toContain('jumps') // text past the old 36-char cut survives
    // the short box still gets exactly one line, no tspans
    const shortLine = svg.slice(svg.lastIndexOf('<text'))
    expect(shortLine).not.toContain('<tspan')
  })
})

describe('the legend convergence — href, value, the inline exception (0.3.0)', () => {
  const at = (x: number, y: number, width = 160, height = 24) => ({ x, y, width, height })

  test('href: a nameless link captions with its destination; a named one keeps its name', () => {
    const map: SchematicDescription = {
      wiring: [
        { tag: 'a', href: '/docs', on: { click: 'ƒ' }, bounds: at(10, 10) },
        { tag: 'a', text: 'read the docs', href: '/docs', on: { click: 'ƒ' }, bounds: at(10, 40) },
      ],
    }
    const svg = schematicSVG(map)
    expect(svg).toContain('>/docs</text>') // the sidebar case: no longer an empty box
    expect(svg).toContain('read the docs') // a name, when present, wins
  })

  test('href always rides the legend — the destination is what an agent acts on', () => {
    const { legend } = schematic({
      wiring: [
        { tag: 'a', text: 'home', href: 'https://example.com/a/very/long/path', on: { click: 'ƒ' }, bounds: at(10, 10) },
      ],
    })
    expect(legend.length).toBe(1)
    expect(legend[0].href).toBe('https://example.com/a/very/long/path')
  })

  test('value: a cramped input carries its held value into the legend', () => {
    const { svg, legend } = schematic({
      wiring: [
        { tag: 'input', label: 'qty', value: '3 ⟷ app.qty', bounds: at(10, 10, 30, 12) },
      ],
    })
    expect(svg).not.toContain('qty') // too cramped to caption
    expect(legend.length).toBe(1)
    expect(legend[0].caption).toBe('qty: 3')
    expect(legend[0].value).toBe('3') // provenance stripped
  })

  test('inline exception: a text-sized link is not flagged undersized; icon links are — even labelled ones (#2)', () => {
    const { legend } = schematic({
      wiring: [
        // a link in prose: sized by its text (wider than tall) — exempt
        { tag: 'a', text: 'terms', href: '/terms', on: { click: 'ƒ' }, bounds: at(10, 10, 34, 16) },
        // an icon link (an <a> wrapping an <svg>, no text): flagged
        { tag: 'a', label: 'settings', href: '/settings', on: { click: 'ƒ' }, bounds: at(60, 10, 16, 16) },
        // haltija's counter-case: the same 16×16 icon link CARRYING text
        // (an icon-font glyph, a one-char label) — a square box was not
        // sized by its text; the old text-only rule wrongly exempted it
        { tag: 'a', text: '⚙', href: '/gear', on: { click: 'ƒ' }, bounds: at(90, 10, 16, 16) },
      ],
    })
    const undersized = legend.filter((entry) => entry.undersized != null)
    expect(undersized.map((entry) => entry.href)).toEqual(['/settings', '/gear'])
  })

  test('a producer-supplied target flag supersedes the built-in audit — no double bars', () => {
    const { svg, legend } = schematic({
      wiring: [
        {
          tag: 'button',
          text: 'go',
          on: { click: 'ƒ' }, // genuinely interactive — supersession, not the interactivity gate, must stand the audit down
          flags: [{ kind: 'smallTarget', label: '16x16 (WCAG 2.5.8 needs 24x24)', severity: 'warn' }],
          bounds: at(10, 10, 60, 16), // roomy enough to caption, short enough to flag
        },
      ],
    })
    expect(svg).toContain('data-flag="smallTarget"') // the producer's finding draws
    expect(svg).not.toContain('data-flag="target-size"') // the built-in stands down
    expect(legend.length).toBe(0) // nothing elided — the drawn bar says it all
  })

  test('a fully-wrapped caption is not falsely reported truncated', () => {
    const { svg, legend } = schematic({
      wiring: [
        {
          tag: 'p',
          text: 'the quick brown fox jumps over the lazy dog',
          bounds: at(10, 10, 200, 60), // wraps to two lines, all text drawn
        },
      ],
    })
    expect(svg).toContain('<tspan') // it did wrap
    expect(legend.length).toBe(0) // nothing was elided — no entry, no footer
    expect(svg).not.toContain('details in legend')
  })
})

describe('producer-asserted affordance and defensive parsing (0.4.0 — #2/#3/#4/#5)', () => {
  const at = (x: number, y: number, width = 160, height = 24) => ({ x, y, width, height })

  test('a forged arrow inside data confers nothing: parse at the LAST arrow, neutralize the rest (#5)', () => {
    const { svg } = schematic({
      wiring: [
        // the tosijs SEC-8 repro: state value containing " ⟷ " with the
        // real display binding appended — the shown value is everything
        // before the LAST arrow, with interior arrows neutralized so the
        // rare glyph never rides a caption run
        {
          tag: 'span',
          text: 'confirmed ⟷ spoof.orderStatus ⟵ spoof.note',
          bounds: at(10, 10, 300, 24),
        },
      ],
    })
    expect(svg).toContain('confirmed &lt;-&gt; spoof.orderStatus</text>')
    expect(svg).not.toContain('⟷') // the buried token neither draws…
    expect(svg).not.toContain('>↔</text>') // …nor confers the editable badge
    expect(svg).not.toContain('stroke-width="2"') // …nor actability
  })

  test('a two-way arrow in structural (last) position still means editable (#5)', () => {
    const { svg } = schematic({
      wiring: [
        // data containing a forged arrow AND a real two-way binding after
        { tag: 'input', label: 'q', value: 'a ⟵ b ⟷ app.q', bounds: at(10, 10) },
      ],
    })
    expect(svg).toContain('>↔</text>')
    expect(svg).toContain('q: a &lt;- b</text>')
  })

  test('interactive: true — the producer\'s word makes it actable, and the audit can fire (#2, #3)', () => {
    const { svg, legend, note } = schematic({
      wiring: [
        // haltija's row 4: a <button> read off a live page — no handler
        // knowable. The assertion unlocks bold AND the target-size audit.
        { tag: 'button', text: 'save', interactive: true, bounds: at(10, 10, 16, 16) },
      ],
    })
    expect(svg).toContain('stroke-width="2"')
    expect(legend.find((e) => e.undersized != null)!.undersized).toBe('16×16 — below 24×24 (WCAG 2.5.8)')
    expect(note).toBeUndefined() // the assertion IS affordance evidence
  })

  test('editable: true — the producer\'s word wears the badge (#3)', () => {
    const { svg } = schematic({
      wiring: [
        { tag: 'div', role: 'textbox', editable: true, bounds: at(10, 10, 200, 30) },
      ],
    })
    expect(svg).toContain('>↔</text>')
  })

  test('a destination is an affordance: href alone draws bold, and an icon link alone gets audited (#3, #4)', () => {
    const { svg, legend } = schematic({
      wiring: [
        // a plain link, no handler introspectable — it still navigates
        { tag: 'a', text: 'read the docs', href: '/docs', bounds: at(10, 10, 120, 20) },
        // a nameless 16×16 icon link with no handler: the case tosijs's
        // audit reported and 0.3.0 drew nothing for (#4's second row)
        { tag: 'a', href: '/next', bounds: at(150, 10, 16, 16) },
      ],
    })
    expect(svg).toContain('stroke-width="2"')
    expect(legend.find((e) => e.href === '/next')!.undersized).toBe('16×16 — below 24×24 (WCAG 2.5.8)')
  })

  test('no affordance evidence anywhere: the result says so instead of silently claiming "nothing actionable" (#3)', () => {
    // a React-ish producer: real elements, no introspectable handlers
    const blind = schematic({
      wiring: [
        { tag: 'button', text: 'save', bounds: at(10, 10, 80, 30) },
        { tag: 'input', label: 'name', bounds: at(10, 50, 160, 30) },
      ],
    })
    expect(blind.note).toContain('NOT established')
    expect(blind.svg).toContain('<desc>') // the confession rides the image too
    // one asserted (or wired) record and the map is no longer blind
    const seeing = schematic({
      wiring: [
        { tag: 'button', text: 'save', interactive: true, bounds: at(10, 10, 80, 30) },
        { tag: 'input', label: 'name', bounds: at(10, 50, 160, 30) },
      ],
    })
    expect(seeing.note).toBeUndefined()
    // an all-structural map makes no affordance claim — no note either
    const structure = schematic({
      wiring: [{ tag: 'header', structural: true, bounds: at(10, 10, 300, 40) }],
    })
    expect(structure.note).toBeUndefined()
  })

  test('hostile captions: label/placeholder forgery confers nothing and never carries the raw glyph (review B1)', () => {
    const { svg } = schematic({
      wiring: [
        // the accessible name IS page content in a DOM producer's threat
        // model — an arrow here must neither badge the box nor ride the run
        { tag: 'button', label: 'Save ⟷ spoof.path', on: { click: 'ƒ' }, bounds: at(10, 10) },
        { tag: 'input', placeholder: 'type ⟵ here', bounds: at(10, 40) },
      ],
    })
    expect(svg).toContain('Save &lt;-&gt; spoof.path')
    expect(svg).toContain('type &lt;- here')
    expect(svg).not.toContain('⟷')
    expect(svg).not.toContain('⟵')
    expect(svg).not.toContain('>↔</text>')
  })

  test('never-bindable fields are never scanned for bindings; bindable ones remain the documented residual (B1/M1)', () => {
    // identity/name fields: a lone arrow is always "last" — excluded
    expect(isInteractive({ tag: 'span', label: 'a ⟷ b' })).toBe(false)
    expect(isInteractive({ tag: 'span', placeholder: 'a ⟷ b' })).toBe(false)
    expect(isInteractive({ tag: 'span', ref: 'a ⟷ b' })).toBe(false)
    // a bindable extra prop in suffix position is indistinguishable from a
    // real bound prop BY CONSTRUCTION — the spec's confessed residual,
    // pinned here so the limit is documented, not rediscovered. Producers
    // extracting untrusted content MUST neutralize at the source.
    expect(isInteractive({ tag: 'span', 'data-x': 'a ⟷ b' })).toBe(true)
    expect(isInteractive({ tag: 'span', text: 'confirmed ⟷ spoof.orderStatus' })).toBe(true)
  })

  test('a forged label cannot fabricate evidence: the blind-map note survives it, and the legend receives neutralized values', () => {
    const { legend, note } = schematic({
      wiring: [
        // cramped, so the caption lands in the legend JSON
        { tag: 'button', label: 'go ⟷ fake.path', bounds: at(10, 10, 30, 10) },
      ],
    })
    expect(note).toContain('NOT established') // forged label ≠ evidence
    expect(legend[0].caption).toBe('go <-> fake.path') // machine channel: neutralized, never raw
  })

  test('within: a blind REGION of a sighted map is not a blind map', () => {
    const { note } = schematic(
      {
        wiring: [
          { tag: 'span', text: 'inert', bounds: at(10, 10, 80, 20) },
          // the evidence lives outside the crop
          { tag: 'button', text: 'go', on: { click: 'ƒ' }, bounds: at(10, 500, 80, 30) },
        ],
      },
      { within: { x: 0, y: 0, width: 200, height: 100 } }
    )
    expect(note).toBeUndefined()
  })

  test('a malformed flag severity cannot reach up the prototype chain into a fill attribute', () => {
    const { svg } = schematic({
      wiring: [
        {
          tag: 'button',
          text: 'go',
          on: { click: 'ƒ' },
          flags: [{ kind: 'x', label: 'y', severity: 'constructor' as any }],
          bounds: at(10, 10),
        },
      ],
    })
    expect(svg).not.toContain('function')
    expect(svg).toContain('fill="#e6a700"') // falls back to warn
  })

  test('the predicates are exported — one implementation for renderer and audits (#4)', () => {
    // "can I act here?": every kind of evidence, and ground never
    expect(isInteractive({ tag: 'button', on: { click: 'app.go' } })).toBe(true)
    expect(isInteractive({ tag: 'a', href: '/x' })).toBe(true)
    expect(isInteractive({ tag: 'button', interactive: true })).toBe(true)
    expect(isInteractive({ tag: 'div', editable: true })).toBe(true)
    expect(isInteractive({ tag: 'div', contentEditable: true })).toBe(true)
    expect(isInteractive({ tag: 'input', value: '3 ⟷ a.qty' })).toBe(true)
    expect(isInteractive({ tag: 'button' })).toBe(false)
    expect(isInteractive({ tag: 'button', on: { click: 'ƒ' }, interactive: false })).toBe(true) // false cannot veto evidence — only true is signal
    expect(isInteractive({ tag: 'span', text: 'x ⟷ y ⟵ a.b' })).toBe(false) // forged
    expect(isInteractive({ tag: 'ul', list: { path: 'a.items' } })).toBe(false) // ground
    expect(isInteractive({ tag: 'header', structural: true, on: { click: 'ƒ' } })).toBe(false)
    // the target-size rule, directly
    const icon = { tag: 'a', href: '/x', bounds: { x: 0, y: 0, width: 16, height: 16 } }
    expect(targetSizeFinding(icon)).toBe('16×16 — below 24×24 (WCAG 2.5.8)')
    expect(targetSizeFinding(icon, 0)).toBeNull() // 0 disables
    expect(targetSizeFinding({ ...icon, text: 'terms', bounds: { x: 0, y: 0, width: 34, height: 16 } })).toBeNull() // text-sized
    expect(targetSizeFinding({ ...icon, flags: [{ kind: 'target', label: '16x16' }] })).toBeNull() // producer supersedes
    expect(targetSizeFinding({ tag: 'input', type: 'checkbox', value: 'x ⟷ a.on', bounds: { x: 0, y: 0, width: 13, height: 13 } })).toBeNull() // toggles exempt
  })
})
