import assert from 'assert'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const normalizeTrailing = (s) => `${s.replace(/[ \t]+$/gm, '').trimEnd()}\n`

const md = mdit({ html: true }).use(mditMathTexToMathML, {
  setMathJaxDataAttrs: false,
})

assert.strictEqual(
  normalizeTrailing(md.render('$$x+y$$')),
  normalizeTrailing(`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mi>x</mi>
  <mo>+</mo>
  <mi>y</mi>
</math>`),
  'Single-line $$...$$ should render as a block math token.'
)

assert.strictEqual(
  normalizeTrailing(md.render('$$\r\nx+y\r\n$$')),
  normalizeTrailing(`<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <mi>x</mi>
  <mo>+</mo>
  <mi>y</mi>
</math>`),
  'CRLF block math should normalize and render correctly.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Text $$x$$ more')),
  '<p>Text $$x$$ more</p>\n',
  '$$...$$ inside a paragraph should remain literal text, not partial inline math.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`Price is \$5 and math $x$`)),
  normalizeTrailing(`<p>Price is $5 and math <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'Escaped dollar text should survive while normal inline math still renders.'
)

assert.strictEqual(
  normalizeTrailing(md.render('A $x and text')),
  '<p>A $x and text</p>\n',
  'Unclosed inline math should pass through as literal text.'
)

console.log('Passed parser boundary tests.')
