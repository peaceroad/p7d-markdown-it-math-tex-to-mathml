# p7d-markdown-it-math-tex-to-mathml

p7d-markdown-it-math-tex-to-mathml is a markdown-it plugin that converts TeX-formatted math expressions (inline `$`...`$` and block `$$`...`$$`) in Markdown to MathML using MathJax v4.

## Install

```
npm install @peaceroad/markdown-it-math-tex-to-mathml
npm install @mathjax/src
```

## Use

This package is ESM. The Node entry uses top-level await to preload MathJax TeX extensions, so run it in an ESM context. For browsers, use the browser entry (`@peaceroad/markdown-it-math-tex-to-mathml/script/math-tex-to-mathml.js`) with a bundler that can resolve `@mathjax/src` and its internal imports.

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

Browser entry (if your bundler does not honor the `browser` export condition):

```js
import mdit from 'markdown-it'
import mditMathTexToMathML from '@peaceroad/markdown-it-math-tex-to-mathml/script/math-tex-to-mathml.js'

const md = mdit({ html: true }).use(mditMathTexToMathML)
```

Example usage in a browser module:

```js
const md = mdit({ html: true }).use(mditMathTexToMathML)
document.querySelector('#preview').innerHTML = md.render('Inline $E=mc^2$.')
```

### Options

Defaults shown below (all fields are optional; omit them to use the defaults):

```js
const md = mdit({ html: true }).use(mditMathTexToMathML, {
  // Conversion metrics for MathJax (applies to MathML and SVG)
  em: 16, // base font size in px used by MathJax
  ex: 8, // x-height in px used by MathJax
  containerWidth: 680, // container width in px used for linebreaking/layout
  // Keep MathJax v4 data-* attributes (data-latex, data-mjx-*, data-semantic-*, etc.).
  // Set true if you want to keep them.
  setMathJaxDataAttrs: false,
  // MathML only: collapse whitespace between tags (inline/block independently).
  compactInlineMathML: false,
  compactBlockMathML: false,
  // MathML only: add layout classes (true, "prime,msupBar,integral", or { prime, msupBar, integral }).
  mathmlLayoutClass: '',

  // Use SVG output instead of MathML
  useSvg: false,
  // SVG only: provide a MathJax SVG font class/instance (e.g. MathJaxStix2Font).
  svgFont: '',
  // SVG only: scale factor passed to MathJax SVG output (1 = default).
  svgScale: 1,
  // SVG only: MathJax linebreaking options (inline = allow line breaks in inline math, width = linebreaking width)
  // https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/linebreaking.html
  svgLinebreaks: {}, // e.g. { inline: true, width: '100%' }
  // SVG only: font hosting/customisation (see MathJax v4 font docs)
  svgFontCache: 'local',
  svgFontPath: '', // e.g. '/fonts/mathjax/newcm'
})
```

Options summary:

Applies to both MathML and SVG output:
- `setMathJaxDataAttrs` (default: `false`): keeps MathJax-generated `data-*` metadata (`data-latex`, `data-latex-item`, `data-mjx-*`, `data-semantic-*`, `data-break-align`, `data-mml-node`, `data-c`, `data-cramped`, `data-speech-node`). Set it to `true` to keep these attributes. Browsers ignore `data-*` attributes for rendering, so removing them is safe for static MathML **and SVG** output. For MathML, screen readers rely on native MathML semantics (not `data-*`), so trimming these attributes does not affect speech. Keep them if you plan to re-process the MathML/SVG with MathJax, rely on MathJax's exploration/speech tooling, or want to debug using the embedded metadata. `data-mjx-*` is internal MathJax metadata (not a stable styling hook). This option does not remove non-`data-*` attributes like `xmlns`, `display`, `width`, `height`, `viewBox`, `role`, or `aria-*`.
- `em`, `ex`, `containerWidth`: conversion metrics passed to MathJax. `containerWidth` influences MathJax linebreaking calculations (percent widths resolve against it). For MathML output, browsers ignore MathJax linebreaking hints, so this mostly affects metadata; for SVG, it affects linebreak layout when `svgLinebreaks` is enabled.
- `useSvg` (default: `false`): emit SVG instead of MathML. When `false`, SVG-only options are ignored.

MathML-only options:
- `compactInlineMathML` (default: `false`): collapses whitespace for inline MathML only.
- `compactBlockMathML` (default: `false`): collapses whitespace for block MathML only.
- `mathmlLayoutClass` (default: `''`): adds classes to prime operators and layout helpers. Set it to `true` to enable default class names (`math-layout-prime`, `math-layout-msup-bar`, `math-layout-integral`). Pass a comma-separated string (`"prime,msupBar,integral"`) or pass an object: `{ prime, msupBar, integral }`.

SVG-only options:
- `svgFont` (default: `''`): pass a MathJax SVG font class or instance (e.g. `MathJaxStix2Font`) to switch fonts. In Node.js you can also pass a font name string (e.g. `'stix2'` or `'@mathjax/mathjax-stix2-font'`) if the package is installed. When omitted, MathJax v4 defaults to the New Computer Modern SVG font (via `@mathjax/src` mapping `#default-font` to `@mathjax/mathjax-newcm-font`).
- `svgScale` (default: `1`): scale factor passed to MathJax SVG output.
- `svgLinebreaks` (default: `{}`): passed through to MathJax when the object has keys. `inline` enables linebreaking for inline math; `width` controls the target linebreaking width (CSS length or percentage). When `width` is a percentage, MathJax uses `containerWidth` to resolve it.
- `svgFontCache` (default: `local`): pass-through to MathJax's SVG `fontCache` mode.
- `svgFontPath` (default: `''`): base URL for MathJax SVG font assets (maps to MathJax's `fontPath`).

#### CSS baseline for MathML output (optional)

This plugin does not bundle fonts. For MathML output, the browser chooses a math font; use CSS to pin one and to style the `math-layout-*` classes emitted by `mathmlLayoutClass`.

If prime symbols or `|^2` style superscripts look too small in MathML output, enable `mathmlLayoutClass` and add CSS.

```js
const md = mdit({ html: true }).use(mditMathTexToMathML, {
  mathmlLayoutClass: true,
})
```

See `style/math-newcm.css` (and `style/math-stix2.css`) for the full baseline styles.

Minimal example:

```css
@font-face {
  font-family: custom-math;
  src: local('NewCMMath-Regular'),
       url('/fonts/math/NewCMMath-Regular.otf') format('opentype');
  font-style: normal;
  font-weight: 400;
}

math {
  font-family: custom-math, math;
}
```

#### SVG math output (optional)

Browser/bundler usage (font package must be installed so the bundler can include it):

- Use the browser entry (or a bundler that honors the `browser` export condition).
- For the default New Computer Modern SVG font, you can omit `svgFont` (no extra import needed).
- Use `svgFont` when you want to switch MathJax's SVG font package (class import required in browsers).
- Use `svgFontPath` when you want MathJax to fetch SVG font assets from a hosted location.
  You can use both: `svgFont` picks the font, `svgFontPath` tells MathJax where the `svg/` assets live.
- Note: string `svgFont` values (e.g. `'stix2'`) are Node-only; browsers/bundlers must import the font class.

Default New Computer Modern (no font import required):

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  // svgFontPath: '/fonts/mathjax/newcm', // optional: base URL for svg/ assets
})
```

Switching to STIX Two Math (font class import required):

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'
import { MathJaxStix2Font } from '@mathjax/mathjax-stix2-font/mjs/svg.js'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: MathJaxStix2Font,
  // svgFontPath: '/fonts/mathjax/stix2', // optional: base URL for svg/ assets
})
```

Node-only shorthand (package must be installed; no explicit import):

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: 'stix2', // newcm, stix2, pagella, termes
})
```

For browser/bundler builds, import the font class and pass it to `svgFont`.
