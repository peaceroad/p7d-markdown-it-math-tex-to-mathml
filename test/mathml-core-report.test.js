import assert from 'assert'
import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const md = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: false,
  mathmlMode: 'mathjax',
  mathmlReport: true,
})

const env = {}

const html = md.render([
  String.raw`Inline $\mathbb{R}$ and $\mathbf{E}$.`,
  '',
  String.raw`$$\cancel{x}$$`,
  '',
  String.raw`$$\tag{1} x$$`,
].join('\n'), env)

assert.ok(html.includes('<math'), 'Expected MathML output in report-enabled MathJax mode.')
assert.ok(Array.isArray(env.mathmlReport), 'Expected env.mathmlReport to be initialized.')
assert.strictEqual(env.mathmlReport.length, 4, 'Expected one finding entry per interoperability-relevant expression in MathJax mode.')

const reportByTex = new Map(env.mathmlReport.map((entry) => [entry.tex, entry]))
const doubleStruckReport = reportByTex.get(String.raw`\mathbb{R}`)
const boldReport = reportByTex.get(String.raw`\mathbf{E}`)
const cancelReport = reportByTex.get(String.raw`\cancel{x}`)
const tagReport = reportByTex.get(String.raw`\tag{1} x`)

assert.ok(doubleStruckReport, 'Expected a report entry for \\mathbb{R} in MathJax mode.')
assert.ok(boldReport, 'Expected a report entry for \\mathbf{E}.')
assert.ok(cancelReport, 'Expected a report entry for \\cancel{x}.')
assert.ok(tagReport, 'Expected a report entry for \\tag{1} x.')

assert.strictEqual(doubleStruckReport.display, false, 'Expected inline \\mathbb report to be marked as non-display.')
assert.strictEqual(doubleStruckReport.tex, String.raw`\mathbb{R}`, 'Expected the original TeX content in the \\mathbb report entry.')
assert.deepStrictEqual(
  doubleStruckReport.issues,
  [{ type: 'legacy-mathvariant', element: 'mi', value: 'double-struck' }],
  'Expected MathJax mode to report legacy double-struck mathvariant usage.'
)

assert.strictEqual(boldReport.display, false, 'Expected inline math report to be marked as non-display.')
assert.strictEqual(boldReport.tex, String.raw`\mathbf{E}`, 'Expected the original TeX content in the report entry.')
assert.deepStrictEqual(
  boldReport.issues,
  [{ type: 'legacy-mathvariant', element: 'mi', value: 'bold' }],
  'Expected \\mathbf to report legacy mathvariant usage.'
)

assert.strictEqual(cancelReport.display, true, 'Expected block math report to be marked as display.')
assert.strictEqual(cancelReport.tex, String.raw`\cancel{x}`, 'Expected the original block TeX content in the report entry.')
assert.deepStrictEqual(
  cancelReport.issues,
  [{ type: 'non-core-element', element: 'menclose' }],
  'Expected \\cancel to report non-Core element usage.'
)

assert.strictEqual(tagReport.display, true, 'Expected tagged block math to be marked as display.')
assert.strictEqual(tagReport.tex, String.raw`\tag{1} x`, 'Expected the original tagged TeX content in the report entry.')
assert.deepStrictEqual(
  tagReport.issues,
  [{ type: 'non-core-element', element: 'mlabeledtr' }],
  'Expected \\tag to report non-Core element usage.'
)

const fontSizeMd = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: false,
  mathmlReport: true,
})

const nestedFontSizeEnv = {}
fontSizeMd.render(String.raw`$\tiny x, \small x, x, \large x, \Large x$`, nestedFontSizeEnv)

assert.deepStrictEqual(
  nestedFontSizeEnv.mathmlReport,
  [
    {
      tex: String.raw`\tiny x, \small x, x, \large x, \Large x`,
      display: false,
      issues: [
        { type: 'nested-mathsize', element: 'mstyle', value: '0.9em', ancestorValue: '0.6em' },
        { type: 'nested-mathsize', element: 'mstyle', value: '1.095em', ancestorValue: '0.9em' },
        { type: 'nested-mathsize', element: 'mstyle', value: '1.2em', ancestorValue: '1.095em' },
      ],
    },
  ],
  'Expected ungrouped font-size declarations to report nested relative mathsize values.'
)

const groupedFontSizeEnv = {}
fontSizeMd.render('${\\tiny x}, {\\small x}, x, {\\large x}, {\\Large x}$', groupedFontSizeEnv)

assert.deepStrictEqual(
  groupedFontSizeEnv.mathmlReport,
  [],
  'Expected grouped font-size declarations to avoid nested relative mathsize reports.'
)

const mathErrorMd = new MarkdownIt({ html: true }).use(plugin, {
  setMathJaxDataAttrs: false,
  mathmlReport: true,
  texPackages: ['base'],
})

const mathErrorEnv = {}
mathErrorMd.render(String.raw`$$\cancel{x}$$`, mathErrorEnv)

assert.deepStrictEqual(
  mathErrorEnv.mathmlReport,
  [
    {
      tex: String.raw`\cancel{x}`,
      display: true,
      issues: [{ type: 'math-error', element: 'merror' }],
    },
  ],
  'Expected MathJax merror output to be reported for production diagnostics.'
)

assert.throws(
  () => new MarkdownIt({ html: true }).use(plugin, { mathmlMode: 'strict' }),
  /Unsupported mathmlMode/i,
  'Unsupported future-looking mathmlMode values should fail loudly for now.'
)

console.log('Passed MathML report test.')
