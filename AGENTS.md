# Notes for agents

## Implementation flow details

### Scope and module constraints

- This document reflects current behavior in `index.js`.
- The package is ESM (`type: module`) and uses top-level `await` to import MathJax TeX extensions.

### TeX extensions

- TeX packages are derived from `@mathjax/src/components/mjs/source.js` `[tex]/...` entries.
- All extensions are imported once at module load so conversions can run synchronously.
- `bussproofs` is explicitly excluded from the default packages list.

### Shared contexts

- MathML context is created once at module load and reused across renders:
  `liteAdaptor` + `TeX` + `HTMLDocument` + `SerializedMmlVisitor`.
- SVG context shares `liteAdaptor` + `RegisterHTMLHandler` + `TeX`.
  A new `SVG` OutputJax + `HTMLDocument` is created per plugin instance when `useSvg` is true.

### Parsing and rendering

- Block math supports `$$` on its own lines and `$$...$$` on a single line.
- Inline math detects `$...$` using the first following `$`; `$$` is not treated as inline.
- Emits `html_block` and `math_inline` tokens containing rendered MathML/SVG.

### Conversion steps

- MathML: MathJax converts, optional `mathmlClassMap` tags are applied to the MmlTree, `SerializedMmlVisitor` serializes, optional attribute stripping, optional compaction.
- SVG: MathJax converts to an SVG node, the document is cleared, and `outerHTML` is returned.

### Options and behavior

- `useSvg` switches output from MathML to SVG.
- `removeMathJaxData` strips MathJax-generated `data-*` metadata; other `data-*` attributes are preserved.
  It does not remove non-`data-*` attributes like `xmlns`, `display`, `width`, `height`, `viewBox`, `role`, or `aria-*`.
- `compactMathML` removes whitespace between tags and trims the output.
- `mathmlClassMap` controls class injection in MathML (applied via MmlTree traversal before serialization):
  - `true` enables `math-layout-prime`, `math-layout-msup-bar`, `math-layout-integral`.
  - A string applies to prime operators only.
  - An object `{ prime, msupBar, integral }` controls each target.
- `em`, `ex`, `containerWidth` apply to both MathML and SVG conversion.
- `linebreaks`, `fontCache`, `fontPath`, `svgFont`, `svgScale` apply only when `useSvg` is true.

## MathJax notes

### SVG font resolution (Node-only)

- In Node, `svgFont` may be a string (`newcm`, `stix2`, `pagella`, `termes`, or `@mathjax/...-font`) and is resolved to the corresponding MathJax SVG font class.
- In browsers/bundlers, pass the font class directly; string names are not resolved.
- Resolution uses `node:module` + `createRequire` to load `@mathjax/mathjax-*-font/js/svg.js` (CJS).
  If the package is not found from the plugin root, it retries with a `createRequire` rooted at `@mathjax/src`.
  This makes the default `newcm` font resolvable via `@mathjax/src`'s dependency without an explicit install.
  Other font packages still need to be installed separately.

### Default SVG font

- When `svgFont` is omitted, MathJax v4 defaults to New Computer Modern via `@mathjax/src`'s `#default-font` mapping.

### Browser/bundler usage

- SVG output works in browsers when using a bundler or import map that resolves `@mathjax/src`.
- In browsers, `svgFont` must be a class import (e.g. `MathJaxStix2Font`); the string shorthand is Node-only.

### Data attributes and accessibility

- Browsers ignore MathJax `data-*` attributes for rendering.
- For MathML output, screen readers use MathML semantics rather than MathJax `data-*`.
- Keep MathJax `data-*` if you plan to reprocess with MathJax or need exploration/speech hooks.
  `removeMathJaxData` does not touch non-`data-*` attributes (e.g., `xmlns`, `display`, `width`, `height`, `viewBox`, `role`, `aria-*`).

### Output notes

- MathML output is Presentation MathML serialization.
- MathJax linebreaking hints (e.g. `data-overflow="linebreak"`) are not used by browsers when rendering raw MathML.
- AssistiveMML is a MathJax feature for injecting hidden MathML alongside non-MathML outputs (CHTML/SVG).
  This plugin already emits MathML directly when `useSvg` is false, so AssistiveMML is not relevant there.
