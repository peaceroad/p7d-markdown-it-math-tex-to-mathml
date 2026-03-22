# MathJax フォントノート

この文書は、このプロジェクトでフォント設定がどう関係するかと、MathJax 自体のフォント設定とこの plugin の公開 API の境界を整理するためのものです。

## 対象

この文書が扱うのは、次の 2 つの出力経路です。

- この plugin の native MathML 出力
- この plugin の MathJax SVG 出力

この 2 つはフォントの扱い方がかなり違います。ここを混同すると設定を誤りやすくなります。

## まず大事な区別

実際には、フォントの話は 2 系統あります。

### 1. native MathML のフォント

`useSvg` が `false` のとき、この plugin は raw の `<math>` を出します。

このモードでは:

- MathML の layout はブラウザが行う
- 使うフォントはページ CSS が選ぶ
- plugin はフォントを自動ロードしない

つまり MathML 出力では、ブラウザが直接使える本物の math-capable font が必要です。たとえば:

- OS に入っているローカルフォント
- `@font-face` で自己ホストした OTF / WOFF2

この系統の実フォントの例:

- New Computer Modern Math
- STIX Two Math
- XITS Math
- Libertinus Math

### 2. MathJax SVG 用フォントパッケージ

`useSvg` が `true` のときは、MathJax が SVG を生成し、その内部で自前の font data を扱います。

このモードで関係するのは、次のような MathJax font package です。

- `@mathjax/mathjax-newcm-font`
- `@mathjax/mathjax-stix2-font`
- `@mathjax/mathjax-pagella-font`
- `@mathjax/mathjax-termes-font`

これらは MathJax の出力パイプライン用です。

raw MathML に対して `math { font-family: ... }` でそのまま使う「単一のブラウザフォント」とは別物です。

## MathJax のフォントモデル

MathJax v4 では、フォント選択は共通の `output` block に寄っています。

公式に重要なのは次の option です。

- `output.font`
- `output.fontPath`
- `svg.fontCache`

参照:

- MathJax v4 font support: <https://docs.mathjax.org/en/latest/upgrading/whats-new-4.0/fonts.html>
- MathJax output options: <https://docs.mathjax.org/en/latest/options/output/index.html>
- MathJax SVG output options: <https://docs.mathjax.org/en/latest/options/output/svg.html>

MathJax の公式 demo については:

- web demo は GitHub リポジトリ `mathjax/MathJax-demos-web`
  (<https://github.com/mathjax/MathJax-demos-web>)
- node demo は GitHub リポジトリ `mathjax/MathJax-demos-node`
  (<https://github.com/mathjax/MathJax-demos-node>)

にあります。

これらは、この plugin が直接 import する npm runtime package ではなく、公式の example repository です。
ローカル実行用に `package.json` を持つことはありますが、この plugin の公開 API 面そのものではありません。

公式 docs から押さえておくべき点:

- MathJax v4 の default font は New Computer Modern
- Web では `output.font` で `mathjax-stix2` などを選べる
- `output.fontPath` で font asset の取得先を変えられる
- Node では `@mathjax/mathjax-...-font` を install するとローカル解決できる

## この plugin での写像

この plugin は、MathJax の output option をそのまま露出するのではなく、SVG 専用の plugin option へ写像しています。

- `svgFont`
- `svgFontPath`
- `svgFontCache`
- `svgScale`

対応関係はこうです。

- `svgFont` -> この plugin が MathJax SVG font class を受け取り、`fontData` として渡す
- `svgFontPath` -> MathJax の `fontPath`
- `svgFontCache` -> MathJax SVG の `fontCache`
- `svgScale` -> MathJax output の `scale`

これらは `useSvg: true` のときだけ効きます。

raw MathML 出力では、フォントは `svgFont` ではなくページ CSS で決まります。

つまり関係としては、

- MathJax 公式 docs は `output.font` と `fontPath` で説明している
- この plugin は `svgFont` / `svgFontPath` を公開している
- 明示的な font 切り替えでは、呼び出し側に `output.font` の文字列をそのまま渡させるのではなく、font class / `fontData` を使う

という整理です。

## 公式 demo の flow との違い

MathJax の公式 demo は、基本的に promise-based な使い方を前提にしています。
これは v4 では拡張や font data が動的に読み込まれうるため、generic な MathJax 利用として自然です。

一方、この plugin は同期の markdown-it plugin として動きます。

- markdown-it の render は同期
- 呼び出し側は `md.render()` が即座に文字列を返すことを期待する

そのため、この project は MathJax の flow を同期向けに specialize しています。

- TeX extension は module setup 時に preload する
- MathML 変換は同期のままにする
- SVG は MathJax の dynamic loading path に対して同期 bridge を張る

これは「MathJax の generic な推奨 flow をそのまま使っている」という意味ではありません。
同期 markdown-it plugin という前提に合わせた adaptation です。

## 現在のこのプロジェクトの挙動

### MathML 出力

この plugin はフォントファイルを同梱しません。

同梱の baseline stylesheet:

- `style/math-newcm.css`
- `style/math-stix2.css`

は、既定ではローカルにその数学フォントが入っている前提です。必要なら `@font-face` の source は利用者側で差し替えます。

公開用 CSS の source はここです。

- `style-src/math-mathml-base.css`
- `style-src/math-mathml-presentation.css`
- `style-src/math-mathml-newcm-font.css`
- `style-src/math-mathml-stix2-font.css`

### SVG 出力

Node では:

- `svgFont` に class か `'newcm'`, `'stix2'` などの文字列 shorthand を渡せる
- `svgFont` を省略すると default の `newcm` 経路を使う
- `svgFontPath` は MathJax の `fontPath` に渡る
- `svgFontCache` は MathJax SVG の `fontCache` に渡る
- MathJax に既存の同期 `asyncLoad` bridge があれば、この plugin はそれと合成して使う
- 既存の `asyncLoad` が非同期なら、黙って上書きせず SVG render 時に明示エラーにする

ブラウザ / bundler では:

- `svgFont` は font class import が必須
- 文字列 shorthand は解決しない
- `svgFontPath` は SVG font asset の取得先として使える

## MathML で使うフォント

raw MathML には、CSS から直接使える本物の数式フォントを使います。

最小例:

```css
@font-face {
  font-family: custom-math;
  src: local('STIX Two Math'),
       url('/fonts/STIXTwoMath-Regular.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
}

math {
  font-family: custom-math, math;
}
```

重要なのは、MathJax の SVG/CHTML 用パッケージを、そのまま raw MathML 用 CSS フォントだと思わないことです。

## SVG で使うフォント

SVG 出力では、この plugin の SVG option を使います。

### ブラウザ / bundler

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

`svgFont` を省略した場合は、default の New Computer Modern SVG font 経路を使います。

## 実務的な覚え方

次の 1 行で覚えるのがいちばん分かりやすいです。

- raw MathML: 「CSS でブラウザフォントを選ぶ」
- SVG: 「plugin option で MathJax font package を選ぶ」

この区別を崩さないだけで、かなりの設定ミスを防げます。

## この repo の example

`example/generated/pages/` の生成物も、この分け方が見えるようにしています。

- `example/generated/pages/example-mathml.html`
- `example/generated/pages/example-mathml-stix2.html`
- `example/generated/pages/example-svg.html`
- `example/generated/pages/example-svg-stix2.html`

比較ページ:

- `example/generated/compare/example-mathml-compare.html`
- `example/generated/compare/example-svg-compare.html`

これらは `example/build-examples.js` から生成されます。
