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

console.log('Passed plugin install idempotence test.')
