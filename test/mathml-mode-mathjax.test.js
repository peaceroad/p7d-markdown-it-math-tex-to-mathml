import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const render = (src, option = {}) => MarkdownIt({ html: true }).use(plugin, option).render(src)

const options = { setMathJaxDataAttrs: false, mathmlMode: 'mathjax' }

const mathbb = render(String.raw`$\mathbb{R}$`, options)
const mathbf = render(String.raw`$\mathbf{E}$`, options)
const mathcal = render(String.raw`$\mathcal{A}$`, options)
const mathfrak = render(String.raw`$\mathfrak{g}$`, options)
const plain = render(String.raw`$x$`, options)
const cancel = render(String.raw`$$\cancel{x}$$`, options)
const tagged = render(String.raw`$$\tag{1} x$$`, options)

assert.match(
  mathbb,
  /<mi mathvariant="double-struck">R<\/mi>/,
  'Expected mathmlMode: mathjax to keep MathJax-like legacy double-struck output.'
)
assert.match(
  mathbf,
  /<mi mathvariant="bold">E<\/mi>/,
  'Expected mathmlMode: mathjax to keep MathJax-like bold mathvariant output.'
)
assert.match(
  mathcal,
  /<mi mathvariant="script">A<\/mi>/,
  'Expected mathmlMode: mathjax to keep MathJax-like script mathvariant output.'
)
assert.match(
  mathfrak,
  /<mi mathvariant="fraktur">g<\/mi>/,
  'Expected mathmlMode: mathjax to keep MathJax-like fraktur mathvariant output.'
)
assert.match(
  plain,
  /<mi>x<\/mi>/,
  'Expected ordinary identifiers to remain unchanged in mathmlMode: mathjax.'
)
assert.match(
  cancel,
  /<menclose notation="updiagonalstrike">/,
  'Expected mathmlMode: mathjax to preserve non-Core menclose output.'
)
assert.match(
  tagged,
  /<mlabeledtr>/,
  'Expected mathmlMode: mathjax to preserve non-Core tagged-equation output.'
)

console.log('Passed mathmlMode: mathjax test.')
