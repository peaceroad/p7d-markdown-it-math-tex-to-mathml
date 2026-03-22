import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const md = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: false,
  mathmlMode: 'browser',
  mathmlReport: true,
})

const env = {}

const html = md.render([
  String.raw`Inline $\mathbf{E}$, $\mathcal{A}$, $\mathscr{A}$, and $\mathit{h}$.`,
  '',
  String.raw`Inline $\mathbf{+}$, $\mathbb{\Gamma}$, $\mathbb{+}$, and $\mathfrak{+}$.`,
  '',
  String.raw`Inline $x$ and $\mathit{x}$.`,
  '',
  String.raw`$$\cancel{\mathbf{+}}$$`,
  '',
  String.raw`$$\cancel{x}$$`,
  '',
  String.raw`$$\tag{1} x$$`,
].join('\n'), env)

assert.ok(html.includes('<math'), 'Expected MathML output in browser mode.')

assert.ok(html.includes('&#x1D404;'), 'Expected \\mathbf{E} to be converted to Unicode bold in browser mode.')
assert.ok(
  !html.includes('<mi mathvariant="bold">&#x1D404;</mi>')
  && !html.includes('<mi mathvariant="bold">𝐄</mi>'),
  'Expected \\mathbf{E} mathvariant to be removed after successful Unicode conversion in browser mode.'
)

assert.ok(
  html.includes('&#x1D49C;&#xFE00;'),
  'Expected \\mathcal{A} to use the MathJax calligraphic Unicode mapping with variation selector.'
)
assert.ok(html.includes('&#x1D49C;'), 'Expected \\mathscr{A} to remain representable as Unicode script.')
assert.ok(html.includes('&#x210E;'), 'Expected \\mathit{h} to use the MathML Core italic h mapping.')
assert.ok(html.includes('&#x213E;'), 'Expected \\mathbb{\\Gamma} to be converted to Unicode double-struck Greek.')
assert.ok(
  html.includes('<mo mathvariant="double-struck">+</mo>'),
  'Expected unsupported \\mathbb symbol content to preserve legacy mathvariant rather than silently downgrading output.'
)
assert.ok(
  html.includes('<mo mathvariant="fraktur">+</mo>'),
  'Expected unsupported \\mathfrak symbol content to preserve legacy mathvariant rather than silently downgrading output.'
)

  assert.ok(
    html.includes('<mo mathvariant="bold" style="font-weight: bold">+</mo>')
    || html.includes('<mo style="font-weight: bold" mathvariant="bold">+</mo>'),
    'Expected unsupported \\mathbf symbol content to preserve mathvariant while adding inline style fallback.'
  )
assert.ok(
  html.includes('<mi>x</mi>'),
  'Expected plain identifier x to remain unchanged in browser mode when it does not come from an explicit variant macro.'
)
assert.ok(
  html.includes('&#x1D465;'),
  'Expected explicit \\mathit{x} to keep using Unicode italic output in browser mode.'
)

assert.ok(Array.isArray(env.mathmlReport), 'Expected env.mathmlReport to be initialized in browser mode.')
assert.strictEqual(
  env.mathmlReport.length,
  6,
  'Expected only residual fallback/non-Core issues to remain visible after browser-mode normalization.'
)

const reportByTex = new Map(env.mathmlReport.map((entry) => [entry.tex, entry]))

assert.strictEqual(
  reportByTex.has('x'),
  false,
  'Expected plain x to remain free of browser-mode report noise.'
)

assert.strictEqual(
  reportByTex.has(String.raw`\mathit{x}`),
  false,
  'Expected successful explicit variant normalization to avoid residual report entries.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\mathbf{+}`),
  {
    tex: String.raw`\mathbf{+}`,
    display: false,
    issues: [{ type: 'style-fallback-mathvariant', element: 'mo', value: 'bold' }],
  },
  'Expected browser mode to report when Unicode conversion falls back to CSS styling.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\cancel{\mathbf{+}}`),
  {
    tex: String.raw`\cancel{\mathbf{+}}`,
    display: true,
    issues: [
      { type: 'style-fallback-mathvariant', element: 'mo', value: 'bold' },
      { type: 'non-core-element', element: 'menclose' },
    ],
  },
  'Expected browser mode to report both style fallback and residual non-Core element usage.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\cancel{x}`),
  {
    tex: String.raw`\cancel{x}`,
    display: true,
    issues: [{ type: 'non-core-element', element: 'menclose' }],
  },
  'Expected browser mode to leave plain identifiers unchanged while still reporting non-Core menclose usage.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\tag{1} x`),
  {
    tex: String.raw`\tag{1} x`,
    display: true,
    issues: [{ type: 'non-core-element', element: 'mlabeledtr' }],
  },
  'Expected browser mode to keep tagged equations report-only and avoid extra label noise.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\mathbb{+}`),
  {
    tex: String.raw`\mathbb{+}`,
    display: false,
    issues: [{ type: 'unconverted-mathvariant', element: 'mo', value: 'double-struck' }],
  },
  'Expected browser mode to preserve unsupported \\mathbb symbol variants and report the remaining legacy variant.'
)

assert.deepStrictEqual(
  reportByTex.get(String.raw`\mathfrak{+}`),
  {
    tex: String.raw`\mathfrak{+}`,
    display: false,
    issues: [{ type: 'unconverted-mathvariant', element: 'mo', value: 'fraktur' }],
  },
  'Expected browser mode to preserve unsupported \\mathfrak symbol variants and report the remaining legacy variant.'
)

console.log('Passed browser-mode MathML normalization test.')
