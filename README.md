# p7d-markdown-it-math-tex-to-mathml

p7d-markdown-it-math-tex-to-mathml is a markdown-it plugin that converts TeX-formatted math expressions (inline `$`...`$` and block `$$`...`$$`) in Markdown to MathML using MathJax v4.

## Install

```
npm install @peaceroad/markdown-it-math-tex-to-mathml
npm install @mathjax/src
```

## Use

This package is ESM. The Node entry uses top-level await to preload MathJax TeX extensions, so run it in an ESM context. For browsers, use the browser entry (`@peaceroad/markdown-it-math-tex-to-mathml/script/math-tex-to-mathml.js`) with a bundler that can resolve `@mathjax/src` and its internal imports.

By default, the plugin preloads MathJax TeX extensions from `@mathjax/src`, excluding `bussproofs` and `bboldx`. `bboldx` is intentionally left out so `\mathbb` does not become a MathJax-private variant that depends on `data-mjx-*` metadata. The `fontsizev3` compatibility package is preloaded for opt-in use, but is excluded from the default active package set so the corrected font-size macro values introduced in MathJax v4.1.2 are used by default.

The default package set is intentionally broad for compatibility. If you want stricter TeX support, pass `texPackages` to limit the active MathJax TeX packages for that `MarkdownIt` instance. Note that the entry still preloads the default extension modules at startup so synchronous conversion keeps working; `texPackages` narrows parser behavior, not startup imports.

### Output contract

When `useSvg` is `false`, this plugin emits Presentation MathML in one of two MathML modes.

- The default MathML mode is `mathmlMode: 'browser'`.
- Browser mode applies project-level normalization to **explicit variant-origin tokens** such as `\mathbb`, `\mathbf`, `\mathcal`, `\mathfrak`, and `\mathit`, using Unicode mathematical alphanumeric output where possible and limited inline-style fallback where Unicode is not available.
  - When browser mode falls back to inline style (for example `\mathbf{+}`), it keeps the legacy `mathvariant` attribute and adds presentational style so current browsers still render while future browsers can take advantage of the preserved attribute.
- Ordinary identifiers such as plain `$x$` are left alone.
- Non-Core constructs such as `\cancel` / `<menclose>` and `\tag` / `<mlabeledtr>` are preserved as Presentation MathML structures.
- `mathmlMode: 'mathjax'` is the opt-out that keeps output closer to MathJax's broader Presentation MathML serialization.
- Neither mode is a strict MathML Core-only subset.
- `texPackages` controls TeX parser behavior for a given `MarkdownIt` instance. It does **not** guarantee that the resulting MathML is limited to MathML Core constructs.

For production native MathML output, use `mathmlReport: true` in preview or CI and treat `math-error`, `non-core-element`, `nested-mathsize`, and residual `mathvariant` findings according to your browser-support policy. If visual fidelity must match MathJax layout for broad TeX input, use `useSvg: true` for that surface.

### Security boundary

This plugin converts TeX into MathML or SVG markup; it is not an HTML sanitizer. The broad default TeX package set includes extensions that can preserve author-supplied attributes such as `href`, `style`, and `class`. Setting markdown-it's `html` option to `false` or setting `setMathJaxDataAttrs: false` does not sanitize this plugin's generated markup.

For untrusted Markdown or TeX input, use an explicit `texPackages` allowlist that omits packages you do not need (for example, start with `['base', 'ams']`), and sanitize the final rendered HTML with a sanitizer configured to preserve the MathML or SVG elements and attributes you intentionally support. The allowlist reduces the input surface but is not a sanitizer. Apply the sanitization policy once to the complete rendered HTML so it also covers markup emitted by markdown-it itself and by other plugins.

Additional notes:

- `docs/en/mathml-css-notes.md` / `docs/ja/mathml-css-notes.md`: CSS baseline for native MathML
- `docs/en/mathml-core-interop-notes.md` / `docs/ja/mathml-core-interop-notes.md`: MathML Core interoperability
- `docs/en/mathjax-font-notes.md` / `docs/ja/mathjax-font-notes.md`: MathML/SVG font setup
- `docs/en/manual-rendering-checks.md` / `docs/ja/manual-rendering-checks.md`: manual browser-rendering checks
- `python tools/convert-newcm-woff2.py --input <path-to-NewCMMath-Regular.otf> [--output <path-to-output.woff2>]`: convert a user-supplied local NewCM Math OTF into a WOFF2 asset with project metadata (use `python3` instead if that is how your environment exposes Python 3; the npm script is only a thin wrapper around `python`)

The detailed notes keep links to the primary external references (MathML Core,
MathJax docs, MDN, and related sources) where those references matter.

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
  // MathML only: add layout classes (true, "prime-only", "prime,msupBar,integral", or { prime, msupBar, integral }).
  mathmlLayoutClass: '',
  // MathML only: choose the raw MathML contract.
  // 'browser' = browser-oriented normalized MathML (default)
  // 'mathjax' = output closer to MathJax Presentation MathML serialization
  mathmlMode: 'browser',
  // MathML only: append interop findings to env.mathmlReport.
  mathmlReport: false,
  // TeX input packages for this MarkdownIt instance. Omit this option to use the broad default set.
  // Pass [] (or ['base']) to restrict parsing to the base package only.
  // texPackages: [],

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
  svgFontCache: 'local', // 'local' or 'none'; MathJax's 'global' mode is not supported
  svgFontPath: '', // e.g. '/fonts/mathjax/newcm'
})
```

Options summary:

Options are normalized and unsupported option values are rejected during plugin setup.
Options marked as MathML-only or SVG-only affect only that output mode.

Applies to both MathML and SVG output:
- `setMathJaxDataAttrs` (default: `false`): keeps MathJax-generated `data-*` metadata (`data-latex`, `data-latex-item`, `data-mjx-*`, `data-semantic-*`, `data-break-align`, `data-mml-node`, `data-c`, `data-cramped`, `data-speech-node`). Set it to `true` to keep these attributes. Browsers ignore `data-*` attributes for rendering, so removing them is safe for static MathML **and SVG** output. For MathML, screen readers rely on native MathML semantics (not `data-*`), so trimming these attributes does not affect speech. Keep them if you plan to re-process the MathML/SVG with MathJax, rely on MathJax's exploration/speech tooling, or want to debug using the embedded metadata. `data-mjx-*` is internal MathJax metadata (not a stable styling hook). This option does not remove non-`data-*` attributes like `xmlns`, `display`, `width`, `height`, `viewBox`, `role`, or `aria-*`.
- `em`, `ex`, `containerWidth`: conversion metrics passed to MathJax. `containerWidth` influences MathJax linebreaking calculations (percent widths resolve against it). For MathML output, browsers ignore MathJax linebreaking hints, so this mostly affects metadata; for SVG, it affects linebreak layout when `svgLinebreaks` is enabled.
- `useSvg` (default: `false`): emit SVG instead of MathML. When `false`, SVG-only options are ignored.

MathML-only options:
- `compactInlineMathML` (default: `false`): collapses whitespace for inline MathML only.
- `compactBlockMathML` (default: `false`): collapses whitespace for block MathML only.
- `mathmlLayoutClass` (default: `''`): adds classes to prime operators and layout helpers. Set it to `true` to enable default class names (`math-layout-prime`, `math-layout-msup-bar`, `math-layout-integral`). Pass a single string to style prime operators only, pass a comma-separated string (`"prime,msupBar,integral"`) to set all three slots positionally, or pass an object: `{ prime, msupBar, integral }`.
- `mathmlMode` (default: `'browser'`): MathML-only output mode. This value is validated during plugin setup, but it affects output only when `useSvg` is `false`. `'browser'` is the project default and normalizes explicit variant-origin tokens (for example `\\mathbb`, `\\mathbf`, `\\mathcal`, `\\mathfrak`, `\\mathit`) toward browser-friendly Unicode MathML where possible. It keeps ordinary identifiers untouched, uses limited inline-style fallbacks for a few unconvertible symbol cases (for example `\\mathbf{+}`) while preserving the legacy `mathvariant` attribute, and preserves original legacy markup when no safe rewrite exists. Non-Core structures such as `<menclose>` and `<mlabeledtr>` are still preserved. `'mathjax'` opts out of that normalization and keeps output closer to MathJax's broader Presentation MathML serialization.
- `mathmlReport` (default: `false`): MathML-only diagnostics flag. When `true`, interoperability findings are appended to `env.mathmlReport` for the final MathML output of the selected `mathmlMode`. Findings can include `math-error`, `non-core-element`, `legacy-mathvariant`, `style-fallback-mathvariant`, `unsupported-mathvariant`, `unconverted-mathvariant`, or `nested-mathsize`. SVG output does not populate this report.
  `math-error` reports MathJax `<merror>` output, which usually means a TeX input/package error such as a macro that is unavailable under the selected `texPackages`.
  `nested-mathsize` reports TeX font-size declarations that became nested relative `mathsize` values, such as `$\tiny x, \small x, \large x$`. For native MathML output, group size changes (`${\tiny x}, {\small x}, {\large x}$`) when you need side-by-side size comparisons, because CSS `em` values are relative to the current parent size.

Inline dollar parsing:
- Inline math uses single-dollar delimiters only. `$$...$$` inside a paragraph is left as literal text; block math still uses `$$`.
- An opening `$` is considered only when it is not escaped, is not part of `$$`, is not followed by whitespace or another `$`, and is not preceded by a digit.
- Currency-like prose is left literal when `$` appears at the start of the line or after whitespace, is followed by a number-like token (`5`, `5.20`, `5,000`), and that token is immediately followed by whitespace, end of line, `.`, `,`, or `:`.
- A digit-leading candidate still needs a valid closing `$`; the parser will not skip an invalid close delimiter just to absorb a later `$...$` span.
- Closed numeric formulas such as `$5$` and `$5^2$` still render as math.
- If you want numeric-leading inline math that should not look like currency prose, continue the TeX expression immediately after the number. Examples: `$5\,a$`, `$5\,\mathrm{kg}$`, `$5\text{ apples}$`. `$5\ a$` also works, but `\,`, `\mathrm{}`, or `\text{}` are clearer in source.

TeX input option:
- `texPackages` (default: omit the option to keep the built-in broad package set): array or comma-separated string of MathJax TeX package names to activate for this `MarkdownIt` instance. `base` is always included automatically. Passing `[]` is equivalent to `['base']`. This is useful when you want stricter input handling or to avoid package-level macro overrides. Example: `texPackages: ['base', 'ams', 'newcommand']` or `texPackages: 'ams,newcommand'`. The MathJax `fontsizev3` compatibility package is not active by default; include it explicitly if you need the pre-4.1.2 font-size macro values, e.g. `texPackages: ['base', 'fontsizev3']`.

SVG-only options:
- `svgFont` (default: `''`): pass a MathJax SVG font class or instance (e.g. `MathJaxStix2Font`) to switch fonts. In Node.js you can also pass a font name string (e.g. `'stix2'` or `'@mathjax/mathjax-stix2-font'`) if the package is installed. When omitted, MathJax v4 defaults to the New Computer Modern SVG font (via `@mathjax/src` mapping `#default-font` to `@mathjax/mathjax-newcm-font`).
  In Node, known MathJax font classes are normalized to the matching CJS font class so synchronous dynamic chunks are registered on the same class instance used by the SVG OutputJax.
  In the Node entry, the plugin also prepares MathJax's synchronous loader. MathJax v4.1.3 loads required dynamic SVG font chunks on demand; the plugin replays chunks already loaded by earlier SVG font instances so repeated `MarkdownIt` instances remain synchronous and stable.
  If MathJax already has a synchronous `asyncLoad` bridge, the plugin reuses it and adds its own fallback resolution.
  If MathJax already has a non-synchronous `asyncLoad` bridge, SVG rendering throws a clear error instead of silently overriding it.
  In Node, string shorthands like `'stix2'` require the matching font package to be installed. If the package can't be resolved, plugin setup fails when you call `.use(..., { useSvg: true, svgFont: 'stix2' })`.
  In Node, omitting `svgFont` is treated as the default `newcm` font path. If `@mathjax/mathjax-newcm-font` can't be resolved, plugin setup fails when you call `.use(..., { useSvg: true })`.
- `svgScale` (default: `1`): scale factor passed to MathJax SVG output.
- `svgLinebreaks` (default: `{}`): passed through to MathJax when the object has keys. `inline` enables linebreaking for inline math; `width` controls the target linebreaking width (CSS length or percentage). When `width` is a percentage, MathJax uses `containerWidth` to resolve it.
- `svgFontCache` (default: `'local'`): controls SVG glyph embedding. Use `'local'` to include per-expression `<defs>` and `<use>` references, or `'none'` to emit paths directly. MathJax's `'global'` mode is not supported because this plugin serializes each converted SVG independently and does not emit a shared page-level glyph cache; unsupported values fail during plugin setup.
- `svgFontPath` (default: `''`): base URL for MathJax SVG font assets (maps to MathJax's `fontPath`).

#### CSS baseline for MathML output (optional)

This plugin does not force a MathML font by itself. For MathML output, the browser will use whatever math-capable font your page selects, so use CSS to pin one and to style the `math-layout-*` classes emitted by `mathmlLayoutClass`.

If prime symbols or `|^2` style superscripts look too small in MathML output, enable `mathmlLayoutClass` and add CSS.

```js
const md = mdit({ html: true }).use(mditMathTexToMathML, {
  mathmlLayoutClass: true,
})
```

See `style/math-newcm.css` (and `style/math-stix2.css`) for the full baseline styles.
Both baseline styles assume a locally installed math font by default.
Replace the `@font-face` source if you want to host the font files yourself.
The shared MathML source is split into a Core-aligned baseline (`style-src/math-mathml-base.css`) and a shared presentation/layout layer (`style-src/math-mathml-presentation.css`); the font-specific fragments and the SVG stylesheet source also live in `style-src/`.
The public `style/math-newcm.css`, `style/math-stix2.css`, and `style/math-svg.css` files are generated standalone bundles so sample HTML and consumer `<link>` tags can keep pointing at a single stylesheet.

The shared baseline mirrors the MathML Core user-agent reset for text-oriented properties such as `direction`, `text-indent`, `letter-spacing`, `word-spacing`, `line-height`, `font-family`, `font-style`, and `font-weight`.
It also adds a few author-level guards that MathML Core does not explicitly list, such as `hanging-punctuation: none`, because modern article typography can visibly break native MathML on some browsers.

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

When editing the shared baseline or any CSS source under `style-src/`, rebuild the standalone CSS files with:

```sh
npm run build:styles
```

#### SVG math output (optional)

Browser/bundler usage (font package must be installed so the bundler can include it):

- Use the browser entry (or a bundler that honors the `browser` export condition).
- For the default New Computer Modern SVG font, you can omit `svgFont` (no extra import needed).
- Use `svgFont` when you want to switch MathJax's SVG font package (class import required in browsers).
- Use `svgFontPath` when you want MathJax to fetch SVG font assets from a hosted location.
  You can use both: `svgFont` picks the font, `svgFontPath` tells MathJax where the `svg/` assets live.
- Note: string `svgFont` values (e.g. `'stix2'`) are Node-only; browsers/bundlers must import the font class.
- In Node, omitting `svgFont` uses the default `newcm` package. If you use a string shorthand like `'stix2'`, that font package must be installed or `.use(..., { useSvg: true })` setup will fail.

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
