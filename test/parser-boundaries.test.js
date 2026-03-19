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
  normalizeTrailing(md.render(String.raw`Escaped inline marker: \$x$`)),
  '<p>Escaped inline marker: $x$</p>\n',
  'Escaped inline $ should not open inline math.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`Escaped block marker: \$$x$$`)),
  '<p>Escaped block marker: $$x$$</p>\n',
  'Escaped $$ inside a paragraph should remain literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`\$$
x
$$`)),
  '<p>$$\nx\n$$</p>\n',
  'An escaped $$ line should not open a block math region.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`Even slashes inline: \\$x$`)),
  normalizeTrailing(`<p>Even slashes inline: \\<math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'An even number of backslashes should leave one literal backslash and still allow inline math.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`Odd slashes inline: \\\$x$`)),
  '<p>Odd slashes inline: \\$x$</p>\n',
  'An odd number of backslashes should keep the inline marker escaped.'
)

assert.strictEqual(
  normalizeTrailing(md.render('A $x and text')),
  '<p>A $x and text</p>\n',
  'Unclosed inline math should pass through as literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5 and $6')),
  '<p>Price is $5 and $6</p>\n',
  'Currency-like dollar text should not be consumed as inline math.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5:')),
  '<p>Price is $5:</p>\n',
  'A currency-like dollar amount followed by a colon should stay literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5.')),
  '<p>Price is $5.</p>\n',
  'A currency-like dollar amount followed by a period should stay literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5, and math $x$')),
  normalizeTrailing(`<p>Price is $5, and math <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'A currency-like dollar amount followed by a comma should stay literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5.20 and math $x$')),
  normalizeTrailing(`<p>Price is $5.20 and math <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'A decimal currency-like dollar amount should stay literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5,000 and math $x$')),
  normalizeTrailing(`<p>Price is $5,000 and math <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'A grouped currency-like dollar amount should stay literal text.'
)

assert.strictEqual(
  normalizeTrailing(md.render('Price is $5:$x$')),
  normalizeTrailing(`<p>Price is $5:<math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'A literal currency-like dollar amount should not prevent a later inline math span from opening.'
)

assert.strictEqual(
  normalizeTrailing(md.render('USD $5 and math $x$')),
  normalizeTrailing(`<p>USD $5 and math <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
</math></p>`),
  'A currency-like dollar amount should not swallow later inline math.'
)

assert.strictEqual(
  normalizeTrailing(md.render('$5$')),
  normalizeTrailing(`<p><math xmlns="http://www.w3.org/1998/Math/MathML">
  <mn>5</mn>
</math></p>`),
  'A closed numeric-only inline math span should still render as math.'
)

assert.strictEqual(
  normalizeTrailing(md.render('$5^2$')),
  normalizeTrailing(`<p><math xmlns="http://www.w3.org/1998/Math/MathML">
  <msup>
    <mn>5</mn>
    <mn>2</mn>
  </msup>
</math></p>`),
  'A numeric-leading inline math span should still render when it has a normal closing delimiter.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`$x+\$+y$`)),
  normalizeTrailing(`<p><math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>x</mi>
  <mo>+</mo>
  <mi mathvariant="normal">$</mi>
  <mo>+</mo>
  <mi>y</mi>
</math></p>`),
  'An escaped dollar inside inline math should not terminate the formula.'
)

assert.strictEqual(
  normalizeTrailing(md.render(String.raw`$\text{price \$5}$`)),
  normalizeTrailing(`<p><math xmlns="http://www.w3.org/1998/Math/MathML">
  <mtext>price $5</mtext>
</math></p>`),
  'An escaped dollar inside \\text should remain part of the MathJax input.'
)

console.log('Passed parser boundary tests.')
