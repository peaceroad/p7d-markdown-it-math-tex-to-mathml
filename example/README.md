# Examples

This directory is split into:

- `src/`: Markdown source files used to build examples
- `generated/pages/`: generated single-view HTML pages
- `generated/compare/`: generated side-by-side compare pages
- `build-examples.js`: rebuilds the generated HTML pages

Recommended entry points:

- `generated/compare/example-mathml-compare.html`
  Compare raw MathML in `mathmlMode: 'browser'` with the `math-newcm.css` and `math-stix2.css` baselines.
- `generated/compare/example-svg-compare.html`
  Compare SVG output with `svgFont: 'newcm'` and `svgFont: 'stix2'`.
- `generated/compare/example-rendering-check-compare.html`
  Compare browser-mode raw MathML against SVG for browser-facing rendering checks.
- `generated/compare/example-rendering-check-mode-compare.html`
  Compare `mathmlMode: 'browser'` against `mathmlMode: 'mathjax'`.

Most other pages in `generated/pages/` are single-view pages or iframe sources used by the compare pages.

Rebuild examples with:

```sh
node example/build-examples.js
```
