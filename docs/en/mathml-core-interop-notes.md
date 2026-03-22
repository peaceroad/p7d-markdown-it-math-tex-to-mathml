# MathML Core Interop Notes

This note records how the current project relates to the latest MathML Core editor's draft and where the project intentionally stops short of being a strict MathML Core emitter.

## Scope

This document is about output semantics and interoperability, not CSS styling details.

The main question is:

- what does the plugin emit today?
- which parts are aligned with MathML Core?
- which parts are still broader MathJax Presentation MathML behavior?

## MathML Core vs Presentation MathML

These are related, but they are not the same layer.

- Presentation MathML is the broader MathML notation for visual mathematical layout
- MathML Core is the browser-oriented core subset that user agents are expected to implement interoperably

So this project's "Core-oriented" steps should be understood as:

- taking broader Presentation MathML output from MathJax
- then moving some parts toward shapes that fit MathML Core and current browser behavior better

This project does not implement a generic "MathML Core normalizer" in the formal spec sense.
That phrase is only a practical shorthand for "make MathJax-generated MathML more Core- and browser-friendly".

Important consequence:

- broader Presentation MathML may still be authored and emitted in browser documents
- but interoperable browser behavior is only defined by MathML Core for the Core subset
- features omitted from Core are described in MathML 4, and Core treats non-Core MathML elements as unknown elements
- so output outside the Core subset depends more heavily on browser-specific implementation behavior or graceful fallback

## Baseline: what the project emits

When `useSvg` is `false`, this project emits serialized Presentation MathML produced by MathJax, with a small number of project-specific post-processing steps:

- optional stripping of MathJax-generated `data-*` metadata
- optional whitespace compaction
- optional `mathmlLayoutClass` CSS hook injection
- `\mathbb` normalization to Unicode double-struck characters

This means the project is **not** a general MathML Core normalizer today.

It is more accurate to describe the current behavior as:

- MathJax Presentation MathML
- plus a few compatibility hardening steps for raw browser MathML

## Latest MathML Core Draft Findings

The latest editor's draft remains consistent with the direction that motivated the current implementation.

References:

- Editor's draft: <https://w3c.github.io/mathml-core/>
- Published TR: <https://www.w3.org/TR/mathml-core/>
- MathJax "Convert Mathvariant to Unicode" filter example: <https://docs.mathjax.org/en/v4.0/advanced/synchronize/filters.html#convert-mathvariant-to-unicode>

### 1. `mathvariant` is still not the preferred path

The current draft explicitly says that the `mathvariant` attribute is only used to cancel automatic italic on `<mi>`.

For other style/variant cases, the proper Unicode Mathematical Alphanumeric Symbols should be used instead.

That matters directly for TeX macros such as:

- `\mathbb`
- `\mathbf`
- `\mathcal`
- `\mathfrak`

Project consequence:

- the existing `\mathbb` Unicode normalization is clearly in the right direction
- other style variants are still emitted using legacy `mathvariant` values, so they are **not** fully Core-oriented yet

## Current status by variant

### `\mathbb`

Current behavior:

- `\mathbb{R}` becomes `ℝ`
- the legacy `mathvariant="double-struck"` attribute is removed

This is the strongest Core-aligned part of the current output strategy.

### `\mathbf`, `\mathcal`, `\mathfrak`, etc.

Current behavior:

- these are still serialized using `mathvariant="bold"`, `mathvariant="script"`, `mathvariant="fraktur"`, and similar legacy values

This is acceptable as Presentation MathML, but it is not the same thing as a strict MathML Core strategy.

## Core element subset vs MathJax output

The current MathML Core element list is intentionally limited.

That means a broader Presentation MathML pipeline can still produce valid MathML that goes beyond the Core subset.

Important examples from this project:

- `\cancel` can produce `<menclose>`
- `\tag` can produce `<mlabeledtr>`

This does **not** make the project incorrect.

It simply means:

- `texPackages` is a TeX parser/input-scope option
- it is not a guarantee that the resulting output is limited to MathML Core constructs

## Meaning of `texPackages`

`texPackages` controls which MathJax TeX packages are active for a given `MarkdownIt` instance.

It is best understood as:

- parser strictness
- macro availability
- package-level behavior control

It should **not** be described as:

- a Core-only output mode
- a strict MathML subset switch

This distinction is important because users can otherwise assume that `texPackages: ['base']` implies MathML Core conformance, which is not what the option is designed to do.

## CSS alignment note

MathML Core now defines a fairly explicit user-agent stylesheet for `<math>`, including values such as:

- `direction: ltr`
- `text-indent: 0`
- `letter-spacing: normal`
- `word-spacing: normal`
- `line-height: normal`
- `font-family: math`
- `font-size: inherit`
- `font-style: normal`
- `font-weight: normal`
- `display: inline math`

This confirms that the project's author-level baseline CSS is moving in the correct direction.

However, the project stylesheet is still intentionally broader than the Core UA stylesheet because it also acts as:

- a consumer theme baseline
- a prose-typography firewall
- a browser workaround layer

So it should be described as:

- Core-informed baseline CSS

not as:

- a direct copy of the MathML Core UA stylesheet

## Best current description of the project

The most accurate short description today is:

- A markdown-it plugin that emits MathJax-backed MathML or SVG
- Default MathML output is browser-oriented Presentation MathML with explicit variant normalization
- The plugin is **not yet** a strict MathML Core emitter

## Current MathML modes

The project now separates the raw MathML contract from reporting:

- `mathmlMode: 'browser'`
- `mathmlMode: 'mathjax'`
- `mathmlReport: true`

### `mathmlMode: 'browser'`

This is the default.

It applies Unicode variant normalization before serialization, but keeps that rewrite focused on **tokens that clearly come from explicit variant macros**.

In practical terms, that means inputs such as:

- `\mathbf{x}`
- `\mathit{x}`
- `\mathcal{A}`
- `\mathfrak{g}`

are candidates for normalization, while an ordinary identifier like plain `$x$` is left alone.

The implementation follows the same general strategy as MathJax's official
"Convert Mathvariant to Unicode" filter example:

- prefer Unicode Mathematical Alphanumeric Symbols when possible
- preserve the one Core-valid `mathvariant="normal"` case on single-character `mi`
- remove legacy `mathvariant` / `data-mjx-variant` usage for transformed tokens
- add a CSS `style` fallback only when Unicode conversion is not possible and a reasonable CSS approximation exists
- preserve the original legacy variant markup when no safe Unicode or CSS fallback exists
- leave plain identifiers unchanged unless they come from an explicit variant directive

Source and provenance:

- official docs page:
  <https://docs.mathjax.org/en/v4.0/advanced/synchronize/filters.html#convert-mathvariant-to-unicode>
- MathJax documentation repository:
  <https://github.com/mathjax/MathJax-docs>
- MathJax source package:
  <https://github.com/mathjax/MathJax-src>

Important boundary:

- this project does **not** import that filter as a runtime helper from npm
- instead, it implements the same mapping approach locally inside the plugin
- the Unicode range tables and style-fallback ideas were adapted from the official example and are now tracked in this repository's own tests and docs

Licensing note:

- MathJax and its documentation are Apache-2.0 licensed
- this repository keeps attribution in these docs and in source comments near the transform mapping tables
- the current implementation is an adapted project-local implementation, not a verbatim runtime dependency on MathJax docs code

Examples:

- `\mathbf{E}` -> `𝐄`
- `\mathcal{A}` -> `𝒜︀`
- `\mathit{h}` -> `ℎ`
- `\mathbf{+}` -> plain `+` with `mathvariant="bold"` kept and `style="font-weight: bold"` added
- plain `x` -> plain `x`

That fallback is intentionally limited.
It is only used when Unicode conversion is not possible and when MathJax's own example provides a reasonable CSS approximation.
When the project takes that path, it keeps the legacy `mathvariant` attribute so future browser implementations can still use it, and adds presentational style so current browsers remain usable without requiring external CSS.
It is an approximation for interoperability, not a claim of perfect typographic equivalence.

If neither Unicode conversion nor a reasonable CSS fallback is available, the project keeps the original legacy variant markup and reports the residual issue.
This avoids silently downgrading unsupported cases such as `\mathbb{+}` to plain punctuation.

This does **not** make the whole output a strict Core subset.

For example:

- non-Core elements such as `<menclose>` still remain
- not every TeX construct can be rewritten to a pure Unicode/Core form

Why the current browser mode stops there:

- `<menclose>` is not just a font-variant issue; rewriting it would require changing the expression structure or dropping notation semantics
- `<mlabeledtr>` from `\tag` is similarly not a simple token-variant rewrite
- forcing those into ad-hoc Core-looking markup would risk incorrect layout, weaker semantics, or surprising incompatibilities

So the current design choice is:

- normalize token-level math variants when there is a clear Unicode/Core story
- report broader non-Core constructs
- leave stricter rejection or alternative rendering strategies to future strict/SVG-oriented modes

### `mathmlMode: 'mathjax'`

This is the opt-out mode.

It skips project normalization and keeps output closer to MathJax's broader Presentation MathML serialization.

That means:

- legacy `mathvariant` output is preserved
- explicit variants such as `\mathbf`, `\mathcal`, `\mathfrak`, and `\mathbb` stay closer to MathJax's raw Presentation MathML form
- non-Core structures such as `<menclose>` and `<mlabeledtr>` remain exactly as MathJax produces them

### `mathmlReport`

Set `mathmlReport: true` when you want interoperability findings for the final MathML output of the selected mode.

Current findings can include:

- `non-core-element`
- `legacy-mathvariant`
- `style-fallback-mathvariant`
- `unsupported-mathvariant`
- `unconverted-mathvariant`

This means:

- in `mathmlMode: 'browser'`, the report usually contains only residual non-Core or fallback cases
- in `mathmlMode: 'mathjax'`, the report can also include broader legacy `mathvariant` findings

`tag` is a typical boundary example.
`\tag` creates structure such as `<mlabeledtr>`, so neither MathML mode changes the HTML/MathML structure there.
It is intentionally outside the token-level rewrite scope.

The cancel family behaves the same way and remains `<menclose>`.
This project does not try to draw `<menclose>` notation with shipped CSS in the standard raw-MathML path.
If the visual result must be reliable, prefer SVG.

Browser-mode-specific findings can include:

- `style-fallback-mathvariant`
- `unsupported-mathvariant`
- `unconverted-mathvariant`

Example:

```js
const env = {}
const html = md.render('Inline $\\mathbf{E}$ and $$\\cancel{x}$$', env)

console.log(env.mathmlReport)
/*
[
  {
    tex: '\\mathbf{+}',
    display: false,
    issues: [
      { type: 'style-fallback-mathvariant', element: 'mo', value: 'bold' }
    ]
  },
  {
    tex: '\\cancel{\\mathbf{+}}',
    display: true,
    issues: [
      { type: 'style-fallback-mathvariant', element: 'mo', value: 'bold' },
      { type: 'non-core-element', element: 'menclose' }
    ]
  }
]
*/
```

Notes:

- the report is reset per render
- expressions without findings are omitted from the array
- when `useSvg: true`, the option is currently ignored and the report stays empty

## Best next improvement

The next most valuable future improvement is no longer "add a report mode" but:

1. decide whether browser mode should become the permanent public default contract
2. widen normalization only when MathJax and MathML Core provide a clear mapping story
3. only later consider a true strict mode that rejects or rewrites broader constructs
4. in parallel, continue work on SVG/browser-rendering robustness for cases where native MathML portability remains poor

This keeps the current broad compatibility intact while making Core-oriented usage explicit.
