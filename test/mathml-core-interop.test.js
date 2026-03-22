import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const render = (src, option = {}) => MarkdownIt({ html: true }).use(plugin, option).render(src)

const mathbb = render(String.raw`$\mathbb{R}$`, { setMathJaxDataAttrs: false })
const mathbf = render(String.raw`$\mathbf{E}$`, { setMathJaxDataAttrs: false })
const mathcal = render(String.raw`$\mathcal{A}$`, { setMathJaxDataAttrs: false })
const mathfrak = render(String.raw`$\mathfrak{g}$`, { setMathJaxDataAttrs: false })
const plain = render(String.raw`$x$`, { setMathJaxDataAttrs: false })
const cancel = render(String.raw`$$\cancel{x}$$`, { setMathJaxDataAttrs: false })
const tagged = render(String.raw`$$\tag{1} x$$`, { setMathJaxDataAttrs: false })

assert.match(
  mathbb,
  /<mi>&#x211D;<\/mi>/,
  'Expected \\mathbb to use Unicode double-struck characters for MathML Core/browser compatibility.'
)
assert.doesNotMatch(
  mathbb,
  /mathvariant="double-struck"/,
  'Expected default MathML to normalize \\mathbb instead of relying on legacy mathvariant="double-struck".'
)

assert.match(
  mathbf,
  /<mi>&#x1D404;<\/mi>/,
  'Expected default MathML to normalize explicit \\mathbf output to Unicode bold.'
)
assert.match(
  mathcal,
  /<mi>&#x1D49C;&#xFE00;<\/mi>/,
  'Expected default MathML to normalize explicit \\mathcal output to Unicode script.'
)
assert.match(
  mathfrak,
  /<mi>&#x1D524;<\/mi>/,
  'Expected default MathML to normalize explicit \\mathfrak output to Unicode fraktur.'
)
assert.match(
  plain,
  /<mi>x<\/mi>/,
  'Expected ordinary identifiers to stay plain in default MathML mode.'
)
assert.doesNotMatch(
  plain,
  /&#x1D465;/,
  'Expected ordinary identifiers not to be rewritten to Unicode italic by default.'
)

assert.match(
  cancel,
  /<menclose notation="updiagonalstrike">/,
  'Expected default MathML mode to preserve non-Core Presentation MathML constructs such as <menclose>.'
)
assert.match(
  tagged,
  /<mlabeledtr>/,
  'Expected default MathML mode to preserve non-Core Presentation MathML constructs such as <mlabeledtr>.'
)

console.log('Passed default MathML mode interoperability contract test.')
