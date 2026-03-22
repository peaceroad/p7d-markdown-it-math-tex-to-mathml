import assert from 'assert'
import mdit from 'markdown-it'
import { mathjax } from '@mathjax/src/mjs/mathjax.js'

import mditMathTexToMathML from '../index.js'

const renderSvg = () =>
  mdit({ html: true }).use(mditMathTexToMathML, {
    useSvg: true,
    setMathJaxDataAttrs: false,
  }).render('Inline $\\mathscr{ABC}$.')

mathjax.asyncLoad = async () => ({})
mathjax.asyncIsSynchronous = false

assert.throws(
  () => renderSvg(),
  /non-synchronous asyncLoad configured/i,
  'Expected a clear error when an asynchronous MathJax asyncLoad bridge is already configured.'
)

const sentinel = { ok: true }
let hits = 0

mathjax.asyncLoad = (modulePath) => {
  if (modulePath === 'sentinel') {
    hits++
    return sentinel
  }
  const error = new Error(`Cannot find module '${modulePath}'`)
  error.code = 'MODULE_NOT_FOUND'
  throw error
}
mathjax.asyncIsSynchronous = true

const html = renderSvg()

assert.ok(html.includes('<svg'), 'Expected SVG output.')
assert.strictEqual(mathjax.asyncLoad('sentinel'), sentinel)
assert.strictEqual(hits, 1, 'Expected the existing synchronous asyncLoad bridge to remain callable.')

console.log('Passed SVG synchronous loader tests.')
