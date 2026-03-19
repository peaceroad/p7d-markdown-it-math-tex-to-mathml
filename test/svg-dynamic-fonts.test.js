import assert from 'assert'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const MARKDOWN = 'Inline $\\\\mathscr{ABC}$.\n\n$$\\\\mathscr{ABC}+\\\\mathbb{R}$$\n'

const normalizeTrailing = (s) => `${s.replace(/[ \t]+$/gm, '').trimEnd()}\n`

const renderSvg = (options) => {
  const md = mdit({ html: true }).use(mditMathTexToMathML, {
    useSvg: true,
    setMathJaxDataAttrs: false,
    ...options,
  })
  return normalizeTrailing(md.render(MARKDOWN))
}

const assertSvgOutput = (html) => {
  assert.ok(html.includes('<svg'), 'Expected SVG output.')
}

const renderRepeatedInstances = (options, times = 3) =>
  Array.from({ length: times }, () => renderSvg(options))

const defaultSvg = renderSvg({})
const newcmSvg = renderSvg({ svgFont: 'newcm' })
const repeatedDefaultSvg = renderRepeatedInstances({})
const repeatedNewcmSvg = renderRepeatedInstances({ svgFont: 'newcm' })

assertSvgOutput(defaultSvg)
assertSvgOutput(newcmSvg)
assert.strictEqual(defaultSvg, newcmSvg, 'Dynamic SVG output should match the explicit newcm font.')
for (const html of repeatedDefaultSvg) {
  assertSvgOutput(html)
  assert.strictEqual(html, defaultSvg, 'Dynamic SVG output should stay stable across MarkdownIt instances.')
}
for (const html of repeatedNewcmSvg) {
  assertSvgOutput(html)
  assert.strictEqual(html, newcmSvg, 'Explicit newcm SVG output should stay stable across MarkdownIt instances.')
}

const tryImport = async (specifier) => {
  try {
    return await import(specifier)
  } catch (error) {
    const code = error?.code
    const message = error?.message ?? ''
    const missing =
      code === 'ERR_MODULE_NOT_FOUND' ||
      code === 'MODULE_NOT_FOUND' ||
      message.includes('Cannot find package') ||
      message.includes('Cannot find module')
    if (missing) return null
    throw error
  }
}

const stix2Module = await tryImport('@mathjax/mathjax-stix2-font/mjs/svg.js')
if (!stix2Module) {
  console.log('Skipping dynamic stix2 SVG font test; @mathjax/mathjax-stix2-font is not installed.')
} else {
  const byName = renderSvg({ svgFont: 'stix2' })
  const byClass = renderSvg({ svgFont: stix2Module.MathJaxStix2Font })
  const repeatedByName = renderRepeatedInstances({ svgFont: 'stix2' })
  assertSvgOutput(byName)
  assertSvgOutput(byClass)
  assert.strictEqual(byName, byClass, 'Dynamic SVG output mismatch for stix2.')
  for (const html of repeatedByName) {
    assertSvgOutput(html)
    assert.strictEqual(html, byName, 'stix2 SVG output should stay stable across MarkdownIt instances.')
  }
}

console.log('Passed dynamic SVG font tests.')
