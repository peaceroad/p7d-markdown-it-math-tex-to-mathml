# MathML CSS Notes

This note collects the CSS lessons learned while building and testing native MathML output for this project.

It is intentionally more detailed than the README. The README should stay short and practical; this document explains why the CSS baseline exists and why some resets are stronger than they may first appear.

## Scope

This document is about native MathML rendered by browsers from raw `<math>` markup.

It does not describe MathJax CHTML output, and it only touches SVG output to explain why SVG needs a different, much smaller CSS baseline.

## MathML Core Baseline

MathML Core explicitly defines user-agent stylesheet defaults for the top-level `<math>` element. In particular, the specification resets text-oriented properties that should not leak from surrounding prose into math layout.

The MathML Core user-agent stylesheet sets these defaults on `<math>`:

- `direction: ltr`
- `text-indent: 0`
- `letter-spacing: normal`
- `line-height: normal`
- `word-spacing: normal`
- `font-family: math`
- `font-size: inherit`
- `font-style: normal`
- `font-weight: normal`
- `math-style: compact`

Why this matters:

- Math layout should not inherit prose indentation and spacing rules.
- Good math rendering depends on math-capable fonts.
- Parent typography often makes sense for paragraphs, but not for mathematical layout.

References:

- MathML Core, top-level `<math>` discussion: <https://www.w3.org/TR/mathml-core/#the-top-level-math-element>
- MathML Core, user-agent stylesheet: <https://www.w3.org/TR/mathml-core/#user-agent-stylesheet>

MathML Core also defines `dir` as a presentational hint for the CSS `direction`
property on MathML elements. That matters because a blanket author rule such as
`math { direction: ltr; }` can accidentally override explicit `dir="rtl"` on a
formula. In this project, the author baseline therefore mirrors the Core
default only when `dir` is absent, and adds explicit `math[dir="ltr"]` /
`math[dir="rtl"]` rules so author CSS still respects the MathML attribute.

MathML Core also maps the `<math display>` attribute to `math-style`:

- default / `display="inline"` -> `math-style: compact`
- `display="block"` -> `math-style: normal`

This project mirrors that mapping at author level because it is part of the
math layout model rather than a visual theme preference.

## Need for an Author-Level Baseline

In theory, browser user-agent styles should already protect MathML from surrounding text typography.

In practice, author CSS can still interfere in several ways:

- broad selectors such as `article * { ... }`
- inherited text typography from site-wide styles
- browser bugs or incomplete MathML/CSS interactions
- font-specific behavior on Safari/WebKit

Because of that, this project keeps two shared MathML source layers:

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`

That baseline is then bundled into:

- `style/math-newcm.css`
- `style/math-stix2.css`

The build step is:

```sh
npm run build:styles
```

## The iOS/WebKit parenthesis bug we ran into

One concrete bug we observed on iOS Safari and iOS Chrome was this:

- formulas such as `\text{MSA}(` or `\operatorname{MSA}(` could render with the opening parenthesis visually overlapping the previous letters

After testing reduced MathML samples, the key trigger turned out to be:

- `hanging-punctuation`

Setting this on the MathML subtree fixed the issue:

```css
math,
math * {
  hanging-punctuation: none;
}
```

Why this happens:

- `hanging-punctuation` is inherited
- it applies broadly
- its `first` behavior can hang opening punctuation or brackets
- MathML layout can make that hanging behavior look like overlap instead of pleasing optical alignment

References:

- MDN `hanging-punctuation`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/hanging-punctuation>

## Baseline rules we consider important

The current baseline uses three layers:

1. MathML Core-like resets
2. additional author-level guards for modern typography leakage
3. shared project theme/layout defaults

### Core-like resets

These are close to the MathML Core user-agent stylesheet:

```css
math:not([dir]) {
  direction: ltr;
  text-indent: 0;
  line-height: normal;
  font-family: math;
  font-size: inherit;
  font-style: normal;
  font-weight: normal;
}

math[dir="ltr" i] {
  direction: ltr;
}

math[dir="rtl" i] {
  direction: rtl;
}

math {
  math-style: compact;
}

math[display="block" i] {
  math-style: normal;
}

math[display="inline" i] {
  math-style: compact;
}

math,
math * {
  letter-spacing: normal;
  word-spacing: normal;
}
```

The public `math-newcm.css` / `math-stix2.css` bundles then add a shared
presentation layer that pins `font-family: custom-math, math;`, keeps a
slightly stronger article-oriented `font-size` / margin setup, and carries the
project's shared layout/workaround rules.

### Additional guards

These are not directly listed by MathML Core, but they are useful in real pages:

```css
math,
math * {
  hanging-punctuation: none;
  text-transform: none;
  text-autospace: no-autospace;
  font-kerning: auto;
  font-feature-settings: normal;
  font-variant-ligatures: normal;
  hyphens: manual;
}

math mi {
  text-transform: math-auto;
}
```

Why these help:

- `hanging-punctuation: none`
  prevents punctuation hanging from prose typography rules
- `text-transform: none`
  protects most of the math subtree from accidental uppercase/small-caps styling
- `math mi { text-transform: math-auto; }`
  restores the MathML Core behavior for identifiers after the broader subtree reset
- `font-kerning: auto`
  restores font-default kerning behavior
- `font-feature-settings: normal`
  avoids site-specific OpenType features leaking into math
- `font-variant-ligatures: normal`
  avoids unexpected ligature policies from prose styles
- `text-autospace: no-autospace`
  reduces interactions with automatic text spacing systems; this is worth
  guarding at subtree level because `text-autospace` is inherited and broad
  prose selectors can otherwise target MathML descendants directly
- `hyphens: manual`
  avoids automatic hyphenation behavior in math-adjacent text handling; keeping
  it on the subtree follows the same defensive pattern as `text-autospace`

### Shared presentation/layout layer

The public stylesheets also include a separate shared presentation/layout layer from:

- `style-src/math-mathml-presentation.css`

That layer is intentionally **not** a MathML Core reset. It contains project
visual defaults and layout/workaround rules such as:

- `font-family: custom-math, math`
- inline/block font-size and margin defaults
- tagged-equation layout rules
- `mathmlLayoutClass`-driven CSS hooks
- WebKit-specific heuristic spacing adjustments

References:

- MDN `letter-spacing`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/letter-spacing>
- MDN `word-spacing`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/word-spacing>
- MDN `font-kerning`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-kerning>
- MDN `text-autospace`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-autospace>

## Recommended author baseline

If you are not using this project's bundled baseline stylesheets and want a good starting point for raw MathML in prose-heavy pages, this is the smallest practical baseline we recommend:

```css
math,
math * {
  hanging-punctuation: none;
  letter-spacing: normal;
  word-spacing: normal;
  text-transform: none;
  text-autospace: no-autospace;
  font-kerning: auto;
  font-feature-settings: normal;
  font-variant-ligatures: normal;
  hyphens: manual;
}

math mi {
  text-transform: math-auto;
}

math {
  text-indent: 0;
  line-height: normal;
  font-family: custom-math, math;
  font-style: normal;
  font-weight: normal;
}

math:not([dir]) {
  direction: ltr;
}

math[dir="ltr" i] {
  direction: ltr;
}

math[dir="rtl" i] {
  direction: rtl;
}
```

This is intentionally explicit. For the problem class we hit in practice, clear per-property resets were easier to reason about and debug than large “reset everything” declarations.

## Avoiding Full Reset on `math`

No. A blanket reset of every CSS property is not a good baseline for MathML.

MathML Core does not say “reset all properties”. It defines a targeted
user-agent baseline for properties that are known to interfere with math
layout, such as `direction`, `text-indent`, `letter-spacing`, `word-spacing`,
`line-height`, `font-family`, `font-style`, and `font-weight`.

There are also properties that should generally *not* be force-reset at author
level:

- `color`
  MathML formulas are expected to inherit surrounding text color unless the
  author intentionally styles them otherwise. MathML Core explicitly shows
  examples where a formula inherits its parent color.
- `display`, `math-style`, `math-depth`, `math-shift`
  These are part of the MathML/CSS math layout model and are better left to
  the browser's MathML implementation and the markup itself.
- `direction`
  This should not be blanket-reset in a way that overrides explicit
  `dir="rtl"` on a formula. Mirror the Core default only when `dir` is absent.

In practice, “reset everything” approaches such as `all: initial`,
`all: unset`, or `all: revert` are too blunt:

- they can wipe out useful inherited styling such as color
- they can diverge from the MathML Core user-agent stylesheet rather than
  mirror it
- `all` does not even affect `direction`, so it is not a complete solution
- they make debugging harder because too many unrelated properties change at once

The better pattern is:

- reset only the properties that commonly break math layout
- preserve useful inheritance where the platform expects it
- add browser-specific guards only when there is a demonstrated rendering issue

## Use of `unset` and `all: revert`

Using `unset` on text properties is usually the wrong tool here.

For inherited properties, `unset` behaves like `inherit`, which is exactly what we are trying to prevent.

Using `all: revert` or similarly broad resets also tends to be too aggressive:

- it can remove useful author styling we intentionally want
- it can obscure which properties actually matter
- it makes debugging harder

For this project, the better approach is:

- keep a small, explicit list of text-oriented resets
- add browser-workaround properties only when there is a concrete rendering problem

One practical example from this project is `text-transform`:

- a broad `text-transform: none` reset is useful to block prose-wide uppercase/small-caps rules
- but MathML Core expects identifier-like `<mi>` content to keep `text-transform: math-auto`
- so the baseline explicitly restores `math-auto` on `math mi`

## Reset Target Scope: `math, math *`

Resetting only the `<math>` element is not always enough.

A page can contain selectors such as:

```css
article * {
  hanging-punctuation: first;
}
```

That would apply directly to descendants like `<mo>` or `<mtext>`, even if `<math>` itself was reset.

That is why the baseline uses both:

- `math`
- `math *`

This is defensive, but deliberate.

## CSS hook design for MathML

This project also uses optional CSS hooks for layout tuning via `mathmlLayoutClass`.

The key design choice is:

- add `class` attributes to existing MathML elements
- do not change the MathML structure just to create styling targets

Why this is the safest pattern:

- `class` is a normal global attribute for MathML, just as it is for HTML
- CSS can target it without relying on MathJax-private metadata
- the underlying MathML semantics stay the same

Examples from this project:

- prime operators get a class on the existing `<mo>`
- `|^2`-style cases get a class on the existing `<msup>`
- integrals with limits get a class on the existing `<msubsup>`

What this project deliberately avoids for hook design:

- inserting extra wrapper elements only for styling
- depending on MathJax-generated `data-mjx-*` attributes as a public styling contract
- enabling layout hooks by default for every consumer

The practical rule is:

- prefer opt-in classes on existing MathML nodes
- keep the hook names clearly presentational (for example `math-layout-*`)
- leave structure and semantics unchanged

This makes the hooks easier to reason about, safer under sanitizers, and less brittle across MathJax changes.

## Troubleshooting order

When native MathML looks wrong, debug CSS before debugging the MathML tree itself.

Recommended order:

1. Check punctuation/layout-affecting text properties:
   - `hanging-punctuation`
   - `letter-spacing`
   - `word-spacing`
   - `line-height`
2. Check typography policies that often leak from prose:
   - `text-transform`
   - `font-feature-settings`
   - `font-variant-ligatures`
   - `font-kerning`
3. Check whether your page applies broad selectors such as `article *`, `.content *`, or utility classes to every descendant.
4. Check font selection:
   - whether the intended math font is actually installed or loaded
   - whether the browser falls back to a different math-capable font
5. Only after that, inspect the MathML structure itself.

This order matters because many visible MathML bugs in real pages are caused by surrounding typography rules, not by the serialized MathML markup.

## Native MathML vs SVG

Native MathML and MathJax SVG have very different CSS needs.

### Native MathML

Needs protection from surrounding text typography because the browser is still doing the layout.

That is why the MathML baseline includes:

- text-spacing resets
- punctuation-hanging reset
- font control
- Safari/WebKit-oriented layout adjustments

### SVG

MathJax SVG output already bakes glyph positions into the SVG paths and layout.

That means `style/math-svg.css` only needs simple container layout rules such as:

- inline vs block display
- margins
- centering block formulas

SVG does not need the same text-typography reset layer.

## Manual rendering harness in this repository

This repository also includes a small manual rendering harness focused on the cases that have actually caused browser issues:

- `example/generated/compare/example-rendering-check-compare.html`
- `example/generated/compare/example-rendering-check-mode-compare.html`

These pages are generated from:

- `example/src/example-rendering-check.md`

Use them when you need to manually verify:

- function-like text followed by an opening parenthesis
- Unicode and legacy-style math variants
- broad-package constructs such as `\cancel` and `\tag`
- visual differences between native MathML and SVG output

Regenerate them with:

```sh
node example/build-examples.js
```

## File layout in this project

Source CSS:

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`
- `style-src/math-mathml-newcm-font.css`
- `style-src/math-mathml-stix2-font.css`
- `style-src/math-svg.css`

Generated public CSS:

- `style/math-newcm.css`
- `style/math-stix2.css`
- `style/math-svg.css`

Rationale:

- `style-src/` is for maintainers
- `style/` is for consumers and npm package contents
- examples can keep linking a single stylesheet per output mode

## Practical recommendation

If you ship raw MathML in prose-heavy pages, start from this mindset:

- treat MathML as needing a small typography firewall
- mirror the MathML Core reset at author level
- add `hanging-punctuation: none` unless you know your page typography is safe
- keep SVG CSS separate and much smaller

If you are debugging a visual MathML issue, check text typography first:

- `hanging-punctuation`
- `letter-spacing`
- `word-spacing`
- `text-transform`
- `font-feature-settings`
- `font-kerning`
- `text-autospace`

Those are often more important than the MathML markup itself.
