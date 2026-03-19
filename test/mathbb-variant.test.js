import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const mdDefault = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: false,
})
const mdWithData = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: true,
})

const variantSource = String.raw`$$\mathbf{E} \in \mathbb{R}^{(P^2 \cdot C) \times D}$$`
const lettersSource = String.raw`$$\mathbb{ABC}$$`
const digitsSource = String.raw`$$\mathbb{12}$$`

const htmlDefault = mdDefault.render(variantSource)
const htmlWithData = mdWithData.render(variantSource)
const htmlLetters = mdDefault.render(lettersSource)
const htmlDigits = mdDefault.render(digitsSource)

assert.match(
  htmlDefault,
  /<mi>&#x211D;<\/mi>/,
  'Expected \\mathbb{R} to serialize as the Unicode double-struck character in stripped MathML output.'
)
assert.doesNotMatch(
  htmlDefault,
  /mathvariant="double-struck"/,
  'MathML output should avoid legacy mathvariant="double-struck" for \\mathbb.'
)
assert.doesNotMatch(
  htmlDefault,
  /data-mjx-variant=/,
  'Stripped MathML output should not require MathJax-private variant metadata.'
)
assert.match(
  htmlWithData,
  /<mi data-latex="R">&#x211D;<\/mi>/,
  'Expected \\mathbb{R} to serialize as a Unicode double-struck character even when MathJax data attributes are kept.'
)
assert.doesNotMatch(
  htmlWithData,
  /mathvariant="double-struck"/,
  'Keeping data attributes should not reintroduce legacy double-struck MathML variants.'
)
assert.match(
  htmlLetters,
  /<mi>&#x1D538;&#x1D539;&#x2102;<\/mi>/,
  'Expected multi-letter \\mathbb output to map to Unicode double-struck characters.'
)
assert.match(
  htmlDigits,
  /<mn>&#x1D7D9;&#x1D7DA;<\/mn>/,
  'Expected numeric \\mathbb output to map to Unicode double-struck digits.'
)

console.log('Passed mathbb Unicode fallback test.')
