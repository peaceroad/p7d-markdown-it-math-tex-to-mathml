import assert from 'assert'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const createWithUnknownFont = () =>
  mdit({ html: true }).use(mditMathTexToMathML, {
    useSvg: true,
    svgFont: 'unknown-font',
  })

assert.throws(createWithUnknownFont, /Unknown SVG font name/i)

console.log('Passed svgFont name validation test.')
