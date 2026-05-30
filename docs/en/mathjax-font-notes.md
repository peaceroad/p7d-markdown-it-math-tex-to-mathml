# MathJax Font Notes

This note explains how fonts relate to this project, and where MathJax's own font settings end and this plugin's public API begins.

## Scope

This document covers two different output paths:

- native MathML output from this plugin
- MathJax SVG output from this plugin

These two paths use fonts differently, and mixing them up is the easiest way to get confused.

## The important distinction

There are really two font stories here.

### 1. Native MathML font selection

When `useSvg` is `false`, this plugin emits raw `<math>` markup.

In that mode:

- the browser performs MathML layout
- the page's CSS selects the font family
- this plugin does not auto-load fonts

That means MathML output needs a real math-capable font that the browser can use directly, for example:

- a locally installed font
- a self-hosted OTF/WOFF2 exposed through `@font-face`

Examples of real fonts in this category are:

- New Computer Modern Math
- STIX Two Math
- XITS Math
- Libertinus Math

### 2. MathJax SVG font packages

When `useSvg` is `true`, MathJax generates SVG output and manages its own font data.

In that mode, the relevant fonts are MathJax font packages such as:

- `@mathjax/mathjax-newcm-font`
- `@mathjax/mathjax-stix2-font`
- `@mathjax/mathjax-pagella-font`
- `@mathjax/mathjax-termes-font`

These packages are for MathJax's own output pipeline.

They are not the same thing as a single browser font file that you can point `math { font-family: ... }` at for raw MathML.

## MathJax's Font Model

MathJax v4 moved font selection into the common `output` block.

Relevant official options are:

- `output.font`
- `output.fontPath`
- `svg.fontCache`

References:

- MathJax v4 font support: <https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/fonts.html>
- MathJax output options: <https://docs.mathjax.org/en/latest/options/output/index.html>
- MathJax SVG output options: <https://docs.mathjax.org/en/latest/options/output/svg.html>

For the official demo pages:

- the web demos live in the GitHub repository `mathjax/MathJax-demos-web`
  (<https://github.com/mathjax/MathJax-demos-web>)
- the node demos live in the GitHub repository `mathjax/MathJax-demos-node`
  (<https://github.com/mathjax/MathJax-demos-node>)

These are example repositories, not npm packages that this plugin imports directly.
They may contain `package.json` files for local development, but they are not the runtime API surface for this plugin.

Important points from the MathJax docs:

- MathJax v4 defaults to the New Computer Modern font family.
- On the web, `output.font` can select fonts such as `mathjax-stix2`.
- `output.fontPath` controls where MathJax loads font assets from.
- In node applications, installing `@mathjax/mathjax-...-font` packages lets MathJax resolve those fonts locally.

## Plugin Mapping of MathJax Settings

This plugin does not expose MathJax's output options verbatim. Instead it gives SVG-specific plugin options:

- `svgFont`
- `svgFontPath`
- `svgFontCache`
- `svgScale`

Project-specific mapping:

- `svgFont` -> this plugin resolves or accepts a MathJax SVG font class and passes it as `fontData`
- `svgFontPath` -> MathJax `fontPath`
- `svgFontCache` -> MathJax SVG `fontCache`
- `svgScale` -> MathJax output `scale`

These options only apply when `useSvg: true`.

For raw MathML output, the font is controlled by your page CSS, not by `svgFont`.

So the relationship is:

- MathJax's public docs talk about `output.font` and `fontPath`
- this plugin exposes `svgFont` / `svgFontPath`
- for explicit font switching, this plugin uses MathJax font classes (`fontData`) rather than asking callers to pass MathJax's raw `output.font` strings through unchanged

## Difference from the Official Demo Flow

MathJax's official demos are usually promise-based examples.
That is the natural generic v4 flow because extensions and font data may load
dynamically.

This plugin has a different host contract:

- markdown-it rendering is synchronous
- callers expect `md.render()` to return a string immediately

So this project intentionally specializes the MathJax flow:

- TeX extensions are preloaded at module setup time
- MathML conversion stays synchronous
- SVG output uses a synchronous bridge for MathJax's dynamic loading path

That is not a claim that this plugin follows MathJax's preferred generic
runtime flow verbatim.
It is a deliberate adaptation for a synchronous markdown-it plugin API.

## Current project behavior

### MathML output

This plugin does not bundle font files.

The baseline stylesheets:

- `style/math-newcm.css`
- `style/math-stix2.css`

assume a locally installed math font by default unless you replace the `@font-face` source yourself.

The source CSS for those public files lives in:

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`
- `style-src/math-mathml-newcm-font.css`
- `style-src/math-mathml-stix2-font.css`

### SVG output

In Node:

- `svgFont` may be a class or a string shorthand such as `'newcm'` or `'stix2'`
- omitted `svgFont` is treated as the default `newcm` path
- `svgFontPath` maps to MathJax's `fontPath`
- `svgFontCache` maps to MathJax's SVG `fontCache`
- if MathJax already has a synchronous `asyncLoad` bridge, this plugin composes with it
- if MathJax already has a non-synchronous `asyncLoad` bridge, SVG rendering throws a clear error rather than silently overriding it

In browsers/bundlers:

- `svgFont` must be a font class import
- string shorthands are not resolved
- `svgFontPath` still controls where MathJax fetches SVG font assets

## MathML Font Choice

For raw MathML, use a real math font exposed to CSS.

Minimal pattern:

```css
@font-face {
  font-family: custom-math;
  src: local('STIXTwoMath-Regular'),
       url('/fonts/STIXTwoMath-Regular.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
}

math {
  font-family: custom-math, math;
}
```

Do not assume that a MathJax SVG/CHTML package is itself a drop-in raw MathML font for CSS.

## NewCM Math WOFF2 regeneration

This repo does not commit NewCM font assets.

If you want a local NewCM Math WOFF2 for self-hosting, start from your own OTF copy.
The most natural upstream source is Antonis Tsolomitis's NewComputerModern package. The local OTF metadata examined during development points to the GUST Font License, and CTAN lists the same upstream package and release site.

This repo intentionally does not include a font-fetching script or commit font assets.
Download the upstream package yourself, keep the source OTF in an ignored/local asset directory, then run the converter on that local file.

- CTAN package: <https://ctan.org/pkg/newcomputermodern>
- upstream release page: <https://download.gnu.org.ua/release/newcm/>
- CTAN package ZIP: use the CTAN package page's "Download" link, or a CTAN mirror URL such as `https://mirrors.ctan.org/fonts/newcomputermodern.zip`.

After extracting the ZIP, use the regular NewCM math OTF:

```text
newcomputermodern/newcomputermodern/otf/NewCMMath-Regular.otf
```

If the upstream archive layout changes, search the extracted tree for `NewCMMath-Regular.otf`.
A convenient local placement in this repo is:

```text
assets/fonts/newcm/NewCMMath-Regular.otf
```

`assets/` is ignored by git, so this keeps local font assets out of commits.

The repo includes an optional local helper:

```bash
python -m pip install fonttools brotli
python tools/convert-newcm-woff2.py --input assets/fonts/newcm/NewCMMath-Regular.otf --output assets/fonts/newcm/NewCMMathCustom-Regular.woff2
```

Use `python3` instead of `python` on systems where the Python 3 executable is named `python3`.

That command converts a user-supplied local NewCM Math OTF into a WOFF2 file.
If `--output` is omitted, the helper writes `<input-stem>.woff2` next to the input file.
The helper also rewrites the WOFF2 metadata so the derived webfont packaging is visibly distinct from the upstream OTF.
It is included for local asset preparation; it does not bundle or download font assets for you.

If you prefer the npm wrapper, use:

```bash
npm run build:newcm-woff2 -- --input assets/fonts/newcm/NewCMMath-Regular.otf --output assets/fonts/newcm/NewCMMathCustom-Regular.woff2
```

The npm wrapper assumes a `python` executable is available on `PATH`; call the Python script directly with `python3` if that is how your environment exposes Python 3.

The license metadata is currently fixed in the helper on purpose. It is repo-specific packaging metadata, not a general-purpose font conversion frontend.
For an application, copy the generated WOFF2 to the app's public/static font directory and point `@font-face` at that hosted file.

## SVG Font Choice

For SVG output, use the plugin's SVG options.

### Browser/bundler

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'
import { MathJaxStix2Font } from '@mathjax/mathjax-stix2-font/mjs/svg.js'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: MathJaxStix2Font,
  svgFontPath: '/fonts/mathjax/stix2',
  svgFontCache: 'local',
})
```

### Node

```js
import mdit from 'markdown-it'
import plugin from '@peaceroad/markdown-it-math-tex-to-mathml'

const md = mdit({ html: true }).use(plugin, {
  useSvg: true,
  svgFont: 'stix2',
  svgFontPath: '/fonts/mathjax/stix2',
  svgFontCache: 'local',
})
```

If you omit `svgFont`, the plugin follows the default New Computer Modern SVG font path.

## Recommended mental model

Use this rule of thumb:

- raw MathML: "pick a browser font with CSS"
- SVG: "pick a MathJax font package with plugin options"

That distinction keeps most font setup mistakes from happening.

## Example files in this repository

The generated example pages under `example/generated/pages/` are meant to reflect that split:

- `example/generated/pages/example-mathml.html`
- `example/generated/pages/example-mathml-stix2.html`
- `example/generated/pages/example-svg.html`
- `example/generated/pages/example-svg-stix2.html`

Compare pages:

- `example/generated/compare/example-mathml-compare.html`
- `example/generated/compare/example-svg-compare.html`

These are generated from `example/build-examples.js`.
