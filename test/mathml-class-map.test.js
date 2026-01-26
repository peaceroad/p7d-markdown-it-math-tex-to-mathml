import assert from 'assert'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const mdDefault = mdit({ html: true }).use(mditMathTexToMathML, {
  setMathJaxDataAttrs: false,
  mathmlLayoutClass: true,
})

const mdCustom = mdit({ html: true }).use(mditMathTexToMathML, {
  setMathJaxDataAttrs: false,
  mathmlLayoutClass: { prime: 'prime-mark', msupBar: 'sup-bar', integral: 'integral-mark' },
})

const source = String.raw`$$f'(x) + g''(x) + h'''(x) + |x|^2 + \int_0^1 x\,dx$$`
const htmlDefault = mdDefault.render(source)
const htmlCustom = mdCustom.render(source)

assert.ok(htmlDefault.includes('<mo class="math-layout-prime">&#x2032;</mo>'), 'Missing default prime class.')
assert.ok(htmlDefault.includes('<mo class="math-layout-prime">&#x2033;</mo>'), 'Missing default double prime class.')
assert.ok(htmlDefault.includes('<mo class="math-layout-prime">&#x2034;</mo>'), 'Missing default triple prime class.')
assert.match(
  htmlDefault,
  /<msup class="math-layout-msup-bar">\s*<mo[^>]*>\|<\/mo>\s*<mn[^>]*>2<\/mn>\s*<\/msup>/,
  'Missing default msup bar class.'
)
assert.match(
  htmlDefault,
  /<msubsup class="math-layout-integral">\s*<mo[^>]*>(?:&#x222B;|&#8747;|&int;)<\/mo>/,
  'Missing default integral class.'
)

assert.ok(htmlCustom.includes('<mo class="prime-mark">&#x2032;</mo>'), 'Missing custom prime class.')
assert.ok(htmlCustom.includes('<mo class="prime-mark">&#x2033;</mo>'), 'Missing custom double prime class.')
assert.ok(htmlCustom.includes('<mo class="prime-mark">&#x2034;</mo>'), 'Missing custom triple prime class.')
assert.match(
  htmlCustom,
  /<msup class="sup-bar">\s*<mo[^>]*>\|<\/mo>\s*<mn[^>]*>2<\/mn>\s*<\/msup>/,
  'Missing custom msup bar class.'
)
assert.match(
  htmlCustom,
  /<msubsup class="integral-mark">\s*<mo[^>]*>(?:&#x222B;|&#8747;|&int;)<\/mo>/,
  'Missing custom integral class.'
)

console.log('Passed mathml prime/msup class test.')
