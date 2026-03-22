# MathML CSS ノート

この文書は、このプロジェクトで native MathML を扱う中で分かった CSS 上の知見をまとめたものです。

README は実用上の短い説明に留め、この文書では「なぜその CSS baseline が必要なのか」「どこまでが MathML Core 由来で、どこからが実運用上の補強なのか」を詳しく書きます。

## 対象範囲

この文書が対象にしているのは、ブラウザが raw の `<math>` をそのまま描画する native MathML です。

- MathJax の CHTML 出力の話ではありません
- SVG 出力については、MathML と何が違うかを説明する範囲でだけ触れます

## MathML Core がすでに言っていること

MathML Core は、トップレベルの `<math>` 要素に対して user-agent stylesheet の既定値を定義しています。そこでは、周囲の本文から漏れてくると困る text 系プロパティが reset されます。

MathML Core の UA stylesheet は、`<math>` に対して少なくとも次を設定します。

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

これが重要な理由は次のとおりです。

- 数式レイアウトに本文用の indentation や spacing が漏れるべきではない
- 数学フォントを使うことが良い数式描画に重要
- 段落では自然な typography が、数式では不自然になることが多い

参照:

- MathML Core, top-level `<math>`: <https://www.w3.org/TR/mathml-core/#the-top-level-math-element>
- MathML Core, user-agent stylesheet: <https://www.w3.org/TR/mathml-core/#user-agent-stylesheet>

MathML Core は、MathML 要素上の `dir` 属性を CSS の `direction`
プロパティに対応づける presentational hint としても定義しています。
このため、author CSS で単純に `math { direction: ltr; }` と固定すると、
明示的な `dir="rtl"` を持つ数式を潰しうります。

このプロジェクトでは、Core の既定値は `dir` が無いときだけ mirror し、
`math[dir="ltr"]` / `math[dir="rtl"]` を明示して、MathML 側の属性を
author CSS でも尊重する形にしています。

MathML Core は、`<math display>` と `math-style` の対応も定義しています。

- 既定 / `display="inline"` -> `math-style: compact`
- `display="block"` -> `math-style: normal`

このプロジェクトでは、ここも視覚テーマではなく math layout model の一部と
考えて、author level で mirror しています。

## author-level baseline がなお必要な理由

理屈の上では、ブラウザの UA stylesheet が MathML を本文 typography から守ってくれるはずです。

ただし実際には、次のような理由でまだ崩れます。

- `article * { ... }` のような広い author CSS
- サイト全体の inherited typography
- ブラウザごとの MathML/CSS 相互作用の差
- Safari / WebKit とフォントの組み合わせによる問題

そのため、このプロジェクトでは shared な MathML source を 2 層に分けています。

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`

これを元に、公開用の次の CSS を生成します。

- `style/math-newcm.css`
- `style/math-stix2.css`

build は以下です。

```sh
npm run build:styles
```

## iOS / WebKit の括弧問題で分かったこと

iOS Safari / iOS Chrome で、次のような式が崩れる問題に遭遇しました。

- `\text{MSA}(`
- `\operatorname{MSA}(`

症状は、開き括弧 `(` が前の文字にめり込んで見える、というものです。

切り分けを進めた結果、トリガーとしてかなり強かったのがこれでした。

- `hanging-punctuation`

MathML subtree にこれを入れると、症状が止まりました。

```css
math,
math * {
  hanging-punctuation: none;
}
```

なぜ効くのか:

- `hanging-punctuation` は継承プロパティ
- 適用対象が広い
- `first` では開き括弧や引用符を hanging 対象にできる
- MathML ではその hanging が「見た目上の重なり」として現れやすい

参照:

- MDN `hanging-punctuation`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/hanging-punctuation>

## baseline として重要だと考えているルール

このプロジェクトの baseline は大きく 3 層です。

1. MathML Core に近い reset
2. 現代の本文 typography leakage を止める追加ガード
3. 共通の project theme / layout defaults

### MathML Core に近い reset

次の reset は、MathML Core の UA stylesheet とかなり近いものです。

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

公開用の `math-newcm.css` / `math-stix2.css` では、この Core-aligned layer の上に
shared presentation layer を重ねて、`font-family: custom-math, math;` や少し強めの
font-size / margin、共有の layout/workaround を与えています。

### 追加ガード

次は MathML Core にそのまま列挙されているわけではありませんが、実際のページでは有効な防御です。

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

それぞれの意図:

- `hanging-punctuation: none`
  本文側の hanging punctuation を数式へ持ち込まない
- `text-transform: none`
  数式 subtree の大部分に uppercase や small-caps が漏れるのを防ぐ
- `math mi { text-transform: math-auto; }`
  広い reset をかけたあとに、identifier に対する MathML Core の挙動を戻す
- `font-kerning: auto`
  font 既定の kerning 挙動へ戻す
- `font-feature-settings: normal`
  本文用 OpenType feature が数式へ漏れるのを防ぐ
- `font-variant-ligatures: normal`
  ligature 方針の漏れを防ぐ
- `text-autospace: no-autospace`
  自動 spacing 系との相互作用を抑える。`text-autospace` は継承されるので、
  broad な本文 selector が MathML の子要素へ直接刺さるケースまで考えると、
  subtree guard にしておく価値があります
- `hyphens: manual`
  数式まわりでの自動 hyphenation の影響を避ける。これも
  `text-autospace` と同じく subtree 側で守る形にしてあります

### 共通の presentation / layout layer

公開用 stylesheet には、次の shared presentation/layout layer も入っています。

- `style-src/math-mathml-presentation.css`

これは MathML Core reset ではなく、project の visual default と
layout/workaround をまとめたものです。たとえば:

- `font-family: custom-math, math`
- inline/block の font-size と margin
- `\tag{}` 用の layout
- `mathmlLayoutClass` 用の CSS hook
- WebKit 向けの heuristic な spacing 調整

参照:

- MDN `letter-spacing`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/letter-spacing>
- MDN `word-spacing`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/word-spacing>
- MDN `font-kerning`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/font-kerning>
- MDN `text-autospace`: <https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/text-autospace>

## 推奨 baseline

このプロジェクトの同梱 CSS を使わず、自前で raw MathML の baseline を引きたいなら、最小限の出発点としては次を勧めます。

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

ここで重要なのは、「大きな reset を 1 つ当てる」のではなく、問題になりやすいプロパティを明示的に止めることです。このほうが、何が効いているかを追いやすく、ブラウザ差の切り分けもしやすいです。

## `math` に対して全部を初期化しない理由

結論から言うと、`math` に対して全 CSS プロパティを一括で初期化するのは、良い baseline ではありません。

MathML Core は「すべてを reset しろ」とは言っておらず、数式レイアウトを壊しやすい text 系プロパティに絞って UA baseline を定義しています。たとえば `direction`, `text-indent`, `letter-spacing`, `word-spacing`, `line-height`, `font-family`, `font-style`, `font-weight` などです。

逆に、author level で一律に reset しないほうがよいものもあります。

- `color`
  数式は、特に明示しなければ周囲の本文色を継承してよいです。MathML Core でも、親の `color` を継承する例が示されています。
- `display`, `math-style`, `math-depth`, `math-shift`
  これらは MathML/CSS の math layout model に属するので、browser の MathML 実装と markup に任せるほうが自然です。
- `direction`
  `dir="rtl"` を持つ数式まで潰すような blanket reset は避けるべきです。Core の既定値を mirror するなら、`dir` が無いときだけに留めるのがよいです。

実務上も、`all: initial`, `all: unset`, `all: revert` のような一括 reset は blunt すぎます。

- `color` のように残したい継承まで消しやすい
- MathML Core の UA stylesheet を mirror するというより、別の reset ルールを上から押しつける形になりやすい
- `all` は `direction` すら対象にしないので、完全な解決にはならない
- 何が本当に効いているのかが分かりにくく、切り分けしづらい

このプロジェクトでよいと考えている方針は次です。

- 数式を壊しやすいプロパティだけを明示的に reset する
- プラットフォームが継承を期待しているものは残す
- browser-specific workaround は、実害が確認できたものだけを追加する

## `unset` や `all: revert` を使わない理由

この用途では `unset` はあまり良い道具ではありません。

継承プロパティに対して `unset` を使うと、実質的に `inherit` 側へ寄るため、「親の悪い値を受け継がないようにしたい」という目的に合いません。

また `all: revert` のような広い reset も、このプロジェクトではやりすぎです。

- 意図して残したい author styling まで消しやすい
- 何が本当に効いているのか分かりにくくなる
- デバッグしづらい

このプロジェクトでは、次の方針のほうが良いと判断しています。

- text 系で問題になりやすいプロパティだけを明示的に reset する
- browser workaround は、実際に症状が確認できたときだけ追加する

このプロジェクトでの具体例が `text-transform` です。

- まず broad に `text-transform: none` を入れて、本文側の uppercase / small-caps ルールを遮断する
- ただし MathML Core では `<mi>` に `text-transform: math-auto` が期待される
- そのため baseline では `math mi` に対して明示的に `math-auto` を戻す

## `math, math *` まで reset する理由

`math` だけ reset しても足りないことがあります。

たとえばページ側に次のような CSS があるとします。

```css
article * {
  hanging-punctuation: first;
}
```

この場合、`<math>` 自体を reset しても、`<mo>` や `<mtext>` に直接その値が刺さります。

そのため、このプロジェクトでは

- `math`
- `math *`

の両方を対象にしています。これは防御的ですが、意図的です。

## MathML の CSS hook 設計について

このプロジェクトでは、`mathmlLayoutClass` によって optional な CSS hook も使っています。

ここでの基本方針は明確です。

- 既存の MathML 要素に `class` を付ける
- style target を作るためだけに MathML の構造は変えない

これが安全な理由:

- `class` は MathML でも通常の global attribute
- MathJax private metadata に依存せず CSS から素直に狙える
- MathML の意味論そのものは変わらない

このプロジェクトでの例:

- prime は既存の `<mo>` に class を付ける
- `|^2` 系は既存の `<msup>` に class を付ける
- 上下限付き integral は既存の `<msubsup>` に class を付ける

逆に、意図的に避けていること:

- styling のためだけに wrapper 要素を増やす
- MathJax が付ける `data-mjx-*` を public な styling contract にする
- すべての利用者に default で layout hook を押しつける

実務上のルールとしては、

- opt-in の class を既存 node に付ける
- 名前は `math-layout-*` のように presentational だと分かるものにする
- 構造と semantics は変えない

とするのがよいです。

このやり方なら、sanitizer 下でも比較的扱いやすく、MathJax 側の内部 metadata 変更にも巻き込まれにくくなります。

## トラブルシュートの順番

native MathML が崩れて見えるときは、MathML の木構造より先に CSS を疑うほうが効率的です。

見る順番としては次を勧めます。

1. まず punctuation/layout に直結する text 系
   - `hanging-punctuation`
   - `letter-spacing`
   - `word-spacing`
   - `line-height`
2. 次に本文から漏れやすい typography policy
   - `text-transform`
   - `font-feature-settings`
   - `font-variant-ligatures`
   - `font-kerning`
3. `article *` や `.content *` のような広い selector が当たっていないか
4. font 選択
   - 想定している数学フォントが本当に入っているか
   - browser が別の math-capable font へ fallback していないか
5. そのあとで MathML の構造を見る

実際には、serialized MathML 自体よりも、周囲の typography leakage のほうが支配的なことが珍しくありません。

## native MathML と SVG は CSS の責務が違う

MathML と SVG は、見た目上は同じ数式でも、CSS に求められる役割がだいぶ違います。

### native MathML

ブラウザがまだ layout を担当しているので、本文 typography から守る必要があります。

そのため MathML baseline には、

- spacing reset
- punctuation hanging の reset
- font control
- Safari / WebKit 向け調整

が入ります。

### SVG

MathJax SVG は glyph の位置や shape を SVG 側に焼き込んでいます。

そのため `style/math-svg.css` がやるべきことは主に wrapper layout だけです。

- inline / block の切り替え
- margin
- block 数式の中央寄せ

MathML のような text-typography firewall は不要です。

## この repository にある manual rendering harness

この repository には、実際にブラウザ差分の問題が出た箇所を手で確認しやすいように、focused な rendering harness も置いてあります。

- `example/generated/compare/example-rendering-check-compare.html`
- `example/generated/compare/example-rendering-check-mode-compare.html`

これらは次の source から生成されます。

- `example/src/example-rendering-check.md`

主に確認したい項目は次です。

- function-like な text の直後の開き括弧
- Unicode 化された variant と legacy-style variant
- `\cancel` や `\tag` のような broad package 由来の式
- native MathML と SVG の見た目差

再生成は以下です。

```sh
node example/build-examples.js
```

## このプロジェクトでのファイル構成

source CSS:

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`
- `style-src/math-mathml-newcm-font.css`
- `style-src/math-mathml-stix2-font.css`
- `style-src/math-svg.css`

公開用 CSS:

- `style/math-newcm.css`
- `style/math-stix2.css`
- `style/math-svg.css`

この構成にしている理由:

- `style-src/` は保守者向け
- `style/` は consumer 向け、npm package 向け
- sample HTML からは従来どおり 1 枚の CSS を読むだけでよい

## 実務的なおすすめ

raw MathML を prose-heavy なページへ載せるなら、基本姿勢はこうです。

- MathML には小さな typography firewall が必要だと考える
- MathML Core の reset を author level でもなぞる
- `hanging-punctuation: none` は基本で入れる
- SVG 側の CSS は別物として小さく保つ

MathML 表示崩れを調べるときは、markup そのものより先に次を疑う価値があります。

- `hanging-punctuation`
- `letter-spacing`
- `word-spacing`
- `text-transform`
- `font-feature-settings`
- `font-kerning`
- `text-autospace`

実際には、MathML のタグ構造よりこれらの typography leakage のほうが支配的なことが少なくありません。
