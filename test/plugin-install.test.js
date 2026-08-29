import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const md = new MarkdownIt({ html: true })

const initialBlockRules = md.block.ruler.getRules('').length
const initialInlineRules = md.inline.ruler.getRules('').length

md.use(plugin, { compactInlineMathML: true })

const firstBlockRules = md.block.ruler.getRules('').length
const firstInlineRules = md.inline.ruler.getRules('').length

assert.strictEqual(firstBlockRules, initialBlockRules + 1, 'Expected one block rule on first install.')
assert.strictEqual(firstInlineRules, initialInlineRules + 1, 'Expected one inline rule on first install.')

const firstRender = md.render('Inline $x$')

md.use(plugin, { useSvg: true })

assert.strictEqual(md.block.ruler.getRules('').length, firstBlockRules, 'Repeated install must not add another block rule.')
assert.strictEqual(md.inline.ruler.getRules('').length, firstInlineRules, 'Repeated install must not add another inline rule.')

const secondRender = md.render('Inline $x$')

assert.strictEqual(secondRender, firstRender, 'Repeated install should keep the first option set.')
assert.ok(secondRender.includes('<math'), 'Expected first-install-wins semantics for repeated .use() calls.')

const invalidMathmlModeMd = new MarkdownIt({ html: true })
assert.throws(
  () => invalidMathmlModeMd.use(plugin, { mathmlMode: 'invalid-mode' }),
  /Unsupported mathmlMode/,
  'Invalid options should fail before marking the MarkdownIt instance as installed.'
)
invalidMathmlModeMd.use(plugin)
assert.ok(
  invalidMathmlModeMd.render('Inline $x$').includes('<math'),
  'A failed setup should not poison the MarkdownIt instance for a later valid install.'
)

const invalidSvgFontMd = new MarkdownIt({ html: true })
assert.throws(
  () => invalidSvgFontMd.use(plugin, { useSvg: true, svgFont: 'unknown-font' }),
  /Unknown SVG font name/,
  'Invalid SVG font options should fail before marking the MarkdownIt instance as installed.'
)
invalidSvgFontMd.use(plugin)
assert.ok(
  invalidSvgFontMd.render('Inline $x$').includes('<math'),
  'A failed SVG setup should not poison the MarkdownIt instance for a later valid install.'
)

const mutableOptions = { useSvg: true, svgFontCache: 'none' }
const mutableOptionsMd = new MarkdownIt({ html: true }).use(plugin, mutableOptions)
mutableOptions.svgFontCache = 'local'
assert.ok(
  !mutableOptionsMd.render('Inline $x$').includes('<defs>'),
  'Options should be captured at setup instead of reading later caller mutations.'
)

const registrationFailureMd = new MarkdownIt({ html: true })
const originalBlockAfter = registrationFailureMd.block.ruler.after
registrationFailureMd.block.ruler.after = () => {
  throw new Error('simulated block-rule registration failure')
}
assert.throws(
  () => registrationFailureMd.use(plugin),
  /simulated block-rule registration failure/,
  'Rule-registration failures should remain visible to the caller.'
)
registrationFailureMd.block.ruler.after = originalBlockAfter
registrationFailureMd.use(plugin)
assert.ok(
  registrationFailureMd.render('Inline $x$').includes('<math'),
  'A failed rule registration should not mark the MarkdownIt instance as installed.'
)

for (const preset of ['default', 'commonmark', 'zero']) {
  const presetMd = new MarkdownIt(preset).use(plugin, {
    compactInlineMathML: true,
    compactBlockMathML: true,
  })
  const output = presetMd.render('Inline $x$.\n\n$$y$$')
  assert.strictEqual(
    output.match(/<math\b/g)?.length,
    2,
    `The ${preset} preset should keep both inline and block math rules available.`
  )
}

console.log('Passed plugin install idempotence test.')
