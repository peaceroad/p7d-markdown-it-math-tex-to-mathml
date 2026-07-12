import assert from 'node:assert'

import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const render = (options, env = {}) =>
  new MarkdownIt({ html: true }).use(plugin, options).render('Inline $x$.', env)

const localCacheSvg = render({ useSvg: true, svgFontCache: 'local' })
assert.ok(localCacheSvg.includes('<defs>'), "svgFontCache: 'local' should embed glyph definitions.")
assert.ok(localCacheSvg.includes('<use '), "svgFontCache: 'local' should reference embedded glyphs.")

const noCacheSvg = render({ useSvg: true, svgFontCache: 'none' })
assert.ok(!noCacheSvg.includes('<defs>'), "svgFontCache: 'none' should not emit glyph definitions.")
assert.ok(!noCacheSvg.includes('<use '), "svgFontCache: 'none' should emit glyph paths directly.")
assert.ok(noCacheSvg.includes('<path '), "svgFontCache: 'none' should contain glyph paths.")

const invalidCacheMd = new MarkdownIt({ html: true })
assert.throws(
  () => invalidCacheMd.use(plugin, { useSvg: true, svgFontCache: 'global' }),
  /Unsupported svgFontCache: global/,
  "svgFontCache: 'global' should fail because the standalone SVG output omits MathJax's page-level cache."
)
invalidCacheMd.use(plugin, { useSvg: true, svgFontCache: 'none' })
assert.ok(
  invalidCacheMd.render('Inline $x$.').includes('<path '),
  'A rejected SVG option should not poison the MarkdownIt instance.'
)
assert.throws(
  () => new MarkdownIt({ html: true }).use(plugin, { useSvg: true, svgFontCache: 'invalid' }),
  /Unsupported svgFontCache: invalid/,
  'Unknown SVG font-cache modes should fail during plugin setup.'
)

const mathmlWithIgnoredSvgOption = render({ svgFontCache: 'global' })
assert.ok(
  mathmlWithIgnoredSvgOption.includes('<math'),
  'SVG-only options should be ignored when useSvg is false.'
)

const scaledSvg = render({ useSvg: true, svgFontCache: 'none', svgScale: 2 })
assert.ok(scaledSvg.includes('style="font-size: 200%;"'), 'svgScale should reach the SVG OutputJax.')

const env = { mathmlReport: [{ stale: true }] }
render({ useSvg: true, mathmlReport: true }, env)
assert.deepStrictEqual(env.mathmlReport, [], 'SVG rendering should reset but not populate mathmlReport.')

console.log('Passed SVG option flow tests.')
