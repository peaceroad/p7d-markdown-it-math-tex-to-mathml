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
  // MathML only: collapse whitespace between tags and emit MathML on a single line.
  compactMathML: false,
  // Use SVG output instead of MathML
  useSvg: false,
  // SVG only: provide a MathJax SVG font class/instance (e.g. MathJaxStix2Font).
  svgFont: undefined,
  // SVG only: pass-through to MathJax linebreaking https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/linebreaking.html
  linebreaks: { inline: true, width: '100%' },
  // SVG only: font hosting/customisation (see MathJax v4 font docs)
  fontCache: 'local',
  fontPath: '@mathjax/mathjax-newcm-font',
  // Conversion metrics for MathJax (applies to MathML and SVG)
  em: 16,
  ex: 8,
  containerWidth: 680,
})
```

- `removeMathJaxData` (default: `false`; aliases: `stripMathJaxData`, `stripDataAttributes`): removes MathJax-generated `data-*` metadata (latex/latex-item/mjx-*/semantic-*/break-align/mml-node/c). Use it for clean markup; leave it `false` if you plan to re-process with MathJax or inspect embedded LaTeX.
- `compactMathML` (default: `false`): collapses whitespace between MathML tags so each math element is emitted on a single line. Ignored when `useSvg` is `true`.
- `useSvg` (default: `false`): emit SVG instead of MathML. When `false`, linebreaks/font options are ignored.
- `svgFont` (default: `undefined`): SVG-only. Pass a MathJax SVG font class or instance (e.g. `MathJaxStix2Font`) to switch fonts.
- `em`, `ex`, `containerWidth`: conversion metrics passed to MathJax. Applies to both MathML and SVG output.
- `linebreaks`, `fontCache`, `fontPath`, `svgFont` apply **only when `useSvg` is `true`**.

#### SVG font data (optional)

Browser/bundler usage (font package must be installed so the bundler can include it):

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'
import { MathJaxStix2Font } from '@mathjax/mathjax-stix2-font/mjs/svg.js'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: MathJaxStix2Font,
})
```

Node helper (resolves installed font packages by name; does not install them):

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'
import { loadSvgFontData } from '@peaceroad/markdown-it-math-tex-to-mathml/node-svg-fonts.js'

const svgFontClass = await loadSvgFontData('stix2') // newcm, stix2, pagella, termes
const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: svgFontClass,
})
```

`node-svg-fonts.js` is an optional helper; the plugin does not import it. Call it in your app and pass the result to `svgFont`.

### Fonts

This plugin does not bundle fonts. When using SVG output or custom MathML fonts, make sure the fonts are installed/hosted in your environment. See `example/fonts.md` (or `example/font_ja.md`).
