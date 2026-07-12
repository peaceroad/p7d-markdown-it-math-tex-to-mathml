import assert from 'assert'
import { createRequire } from 'node:module'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const require = createRequire(import.meta.url)
const { MathJaxNewcmFont } = require('@mathjax/mathjax-newcm-font/js/svg.js')

const getDynamicFontFiles = (FontClass) => {
  const files = [...Object.values(FontClass.dynamicFiles ?? {})]
  for (const extension of FontClass.dynamicExtensions?.values?.() ?? []) {
    files.push(...Object.values(extension.files ?? {}))
  }
  return files
}

const DYNAMIC_MARKDOWN = String.raw`Inline $\mathscr{ABC}$.

$$\mathscr{ABC}+\mathbb{R}$$
`

const normalizeTrailing = (s) => `${s.replace(/[ \t]+$/gm, '').trimEnd()}\n`

const renderSvg = (options, markdown = DYNAMIC_MARKDOWN) => {
  const md = mdit({ html: true }).use(mditMathTexToMathML, {
    useSvg: true,
    setMathJaxDataAttrs: false,
    ...options,
  })
  return normalizeTrailing(md.render(markdown))
}

const assertSvgOutput = (html) => {
  assert.ok(html.includes('<svg'), 'Expected SVG output.')
}

const renderRepeatedInstances = (options, times = 3) =>
  Array.from({ length: times }, () => renderSvg(options))

const newcmDynamicFiles = getDynamicFontFiles(MathJaxNewcmFont)
assert.ok(newcmDynamicFiles.length > 0, 'Expected NewCM to expose dynamic font ranges.')
assert.strictEqual(
  newcmDynamicFiles.filter((dynamic) => dynamic.promise).length,
  0,
  'Dynamic NewCM ranges should be unloaded before the first SVG conversion.'
)

const defaultSvg = renderSvg({})
const loadedNewcmFiles = newcmDynamicFiles.filter((dynamic) => dynamic.promise).length
assert.ok(loadedNewcmFiles > 0, 'SVG conversion should load the dynamic ranges required by the formula.')
assert.ok(
  loadedNewcmFiles < newcmDynamicFiles.length,
  'SVG conversion should not eagerly load unrelated dynamic font ranges.'
)
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
