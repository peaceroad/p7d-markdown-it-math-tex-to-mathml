# p7d-markdown-it-math-tex-to-mathml

p7d-markdown-it-math-tex-to-mathml is a markdown-it plugin that converts TeX-formatted math expressions (inline `$`...`$` and block `$$`...`$$`) in Markdown to MathML using MathJax v4.

## Install

```
npm install @peaceroad/markdown-it-math-tex-to-mathml
npm install @mathjax/src
```

## Use

```js
import mdit from 'markdown-it'
import mditMathTexToMathML from '@peaceroad/markdown-it-math-tex-to-mathml'

const md = mdit({ html: true }).use(mditMathTexToMathML)
let html
html = md.render('Here is an example of an inline formula $E=mc^2$.')
/* Output:
<p>Here is an example of an inline formula <math xmlns="http://www.w3.org/1998/Math/MathML">
  <mi>E</mi>
  <mo>=</mo>
  <mi>m</mi>
  <msup>
    <mi>c</mi>
    <mn>2</mn>
  </msup>
</math>.</p>
*/

html = md.render('$$\nx^2+y^2=z^2\n$$')
/* Output:
<math xmlns="http://www.w3.org/1998/Math/MathML" display="block">
  <msup>
    <mi>x</mi>
    <mn>2</mn>
  </msup>
  <mo>+</mo>
  <msup>
    <mi>y</mi>
    <mn>2</mn>
  </msup>
  <mo>=</mo>
  <msup>
    <mi>z</mi>
    <mn>2</mn>
  </msup>
</math>
*/
```

### Options

```js
const md = mdit({ html: true }).use(mditMathTexToMathML, {
  // Remove MathJax v4 data-* attributes (data-latex, mjx-*, etc.). Useful if you want clean markup.
  removeMathJaxData: true,
  // Use SVG output instead of MathML
  useSvg: false,
  // SVG only: pass-through to MathJax linebreaking https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/linebreaking.html
  linebreaks: { inline: true, width: '100%' },
  // SVG only: font hosting/customisation (see MathJax v4 font docs)
  fontCache: 'local',
  fontPath: '@mathjax/mathjax-newcm-font',
})
```

- `removeMathJaxData` (default: `false`; aliases: `stripMathJaxData`, `stripDataAttributes`): removes MathJax-generated `data-*` metadata (latex/latex-item/mjx-*/semantic-*/break-align/mml-node/c). Use it for clean markup; leave it `false` if you plan to re-process with MathJax or inspect embedded LaTeX.
- `useSvg` (default: `false`): emit SVG instead of MathML. When `false`, linebreaks/font options are ignored.
- `linebreaks`, `fontCache`, `fontPath` apply **only when `useSvg` is `true`**.
