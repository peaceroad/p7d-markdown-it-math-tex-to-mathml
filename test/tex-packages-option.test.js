import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const render = (src, option = {}) => MarkdownIt({ html: true }).use(plugin, option).render(src)

const defaultCancel = render(String.raw`$$\cancel{x}$$`)
const baseOnlyCancel = render(String.raw`$$\cancel{x}$$`, { texPackages: ['base'] })
const emptyListCancel = render(String.raw`$$\cancel{x}$$`, { texPackages: [] })
const amsTag = render(String.raw`$$\tag{1} x$$`, { texPackages: ['ams'] })
const baseOnlyTag = render(String.raw`$$\tag{1} x$$`, { texPackages: ['base'] })
const defaultLarge = render(String.raw`$\large x$`, { compactInlineMathML: true })
const fontsizeV3Large = render(String.raw`$\large x$`, {
  compactInlineMathML: true,
  texPackages: ['base', 'fontsizev3'],
})

assert.match(
  defaultCancel,
  /<menclose notation="updiagonalstrike">/,
  'Default package set should keep extension macros like \\cancel available.'
)
assert.match(
  baseOnlyCancel,
  /<merror>\s*<mtext>Undefined control sequence \\cancel<\/mtext>/,
  'Restricting texPackages to base should disable \\cancel.'
)
assert.match(
  emptyListCancel,
  /<merror>\s*<mtext>Undefined control sequence \\cancel<\/mtext>/,
  'Passing texPackages: [] should narrow the active package set to base only.'
)
assert.match(
  amsTag,
  /<mlabeledtr>/,
  'texPackages should enable requested packages in addition to base.'
)
assert.match(
  baseOnlyTag,
  /<merror>\s*<mtext>Undefined control sequence \\tag<\/mtext>/,
  'texPackages should disable macros from omitted packages.'
)
assert.match(
  defaultLarge,
  /mathsize="1\.095em"/,
  'Default package set should use MathJax 4.1.2 corrected font-size macro values.'
)
assert.match(
  fontsizeV3Large,
  /mathsize="1\.2em"/,
  'texPackages should allow opting into the MathJax fontsizev3 compatibility package.'
)

console.log('Passed texPackages option test.')
