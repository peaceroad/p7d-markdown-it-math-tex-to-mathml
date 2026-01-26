import assert from 'assert'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const MARKDOWN = 'Inline $x+y$.\n\n$$x^2+y^2=z^2$$\n'

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

const compareFontNameToClass = (label, name, FontClass) => {
  const byName = renderSvg({ svgFont: name })
  const byClass = renderSvg({ svgFont: FontClass })
  assertSvgOutput(byName)
  assertSvgOutput(byClass)
  assert.strictEqual(byName, byClass, `SVG output mismatch for ${label}.`)
}

const defaultSvg = renderSvg({})
const newcmSvg = renderSvg({ svgFont: 'newcm' })
assertSvgOutput(defaultSvg)
assertSvgOutput(newcmSvg)
assert.strictEqual(defaultSvg, newcmSvg, 'Default SVG output should match newcm.')

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
  console.log('Skipping stix2 SVG font test; @mathjax/mathjax-stix2-font is not installed.')
} else {
  assert.ok(stix2Module.MathJaxStix2Font, 'MathJaxStix2Font export was not found.')
  compareFontNameToClass('stix2', 'stix2', stix2Module.MathJaxStix2Font)
}

console.log('Passed svg font package tests.')
