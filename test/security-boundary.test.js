import assert from 'node:assert'

import MarkdownIt from 'markdown-it'

import plugin from '../index.js'

const SECURITY_INPUT = String.raw`$\href{javascript:alert(1)}{x}$ $\style{color:red}{y}$ $\class{demo}{z}$`

const broadOutput = new MarkdownIt({ html: false }).use(plugin, {
  setMathJaxDataAttrs: false,
}).render(SECURITY_INPUT)

assert.ok(
  broadOutput.includes('href="javascript:alert(1)"'),
  "markdown-it's html: false option should not be mistaken for sanitizing plugin-generated MathML."
)
assert.ok(broadOutput.includes('style="color:red"'), 'Broad TeX packages should preserve author-supplied style output.')
assert.ok(broadOutput.includes('class="demo"'), 'Broad TeX packages should preserve author-supplied class output.')

const restrictedOutput = new MarkdownIt({ html: false }).use(plugin, {
  setMathJaxDataAttrs: false,
  texPackages: ['base'],
}).render(SECURITY_INPUT)

assert.ok(!restrictedOutput.includes('href="javascript:alert(1)"'), 'A base-only package allowlist should disable \href.')
assert.ok(!restrictedOutput.includes('style="color:red"'), 'A base-only package allowlist should disable \style.')
assert.ok(!restrictedOutput.includes('class="demo"'), 'A base-only package allowlist should disable \class.')
assert.ok(restrictedOutput.includes('<merror'), 'Disabled macros should remain visible as MathJax error output.')

console.log('Passed generated-markup security boundary tests.')
