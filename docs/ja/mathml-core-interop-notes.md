# MathML Core 整合ノート

この文書は、現行プロジェクトの出力が最新の MathML Core editor's draft とどういう関係にあるかを整理するためのメモです。

## 対象

この文書は CSS の細かな話ではなく、出力仕様と互換性の話を扱います。

確認したい問いは次の 3 つです。

- この plugin は今、何を出しているのか
- そのうちどこまでが MathML Core に沿っているのか
- どこがまだ MathJax Presentation MathML 寄りなのか

## MathML Core と Presentation MathML の違い

この 2 つは関係していますが、同じレイヤではありません。

- Presentation MathML は、数式の見た目やレイアウトを表す広い MathML の表現体系
- MathML Core は、browser が相互運用しやすいように切り出された core subset

したがって、この project の「Core 寄りにする」処理は、

- MathJax が出す broad な Presentation MathML を受けて
- その一部を MathML Core と現在の browser 実装により馴染みやすい形へ寄せる

という意味です。

ここで言う「MathML Core normalize」は、仕様上の正式名称ではありません。
この repository では、MathJax 出力を Core/browser-friendly に寄せる、という実務上の shorthand として使っています。

重要なのは次の点です。

- browser 文書により広い Presentation MathML を含めること自体はできる
- ただし browser 間で相互運用が定義されているのは MathML Core の subset 範囲
- Core から落とされた機能は MathML 4 側にあり、Core では non-Core の MathML element は unknown element として扱われる
- したがって Core subset の外では、browser 実装依存や graceful fallback への依存が強くなりやすい

## 現在の出力の立ち位置

`useSvg` が `false` のとき、このプロジェクトは MathJax が生成した Presentation MathML をシリアライズして返します。

そのうえで、このプロジェクト独自に加えている後処理は限定的です。

- MathJax 由来の `data-*` の除去
- 空白圧縮
- `mathmlLayoutClass` の class 注入
- `\mathbb` の Unicode double-struck 正規化

したがって、現在の出力は **一般的な MathML Core normalizer ではありません**。

より正確には次のように表現するのが適切です。

- MathJax Presentation MathML
- に対して、raw MathML を browser で扱いやすくするための最小限の hardening を加えたもの

## 最新 draft で再確認できたこと

最新の editor's draft を確認しても、このプロジェクトの現在の評価は変わりませんでした。

参照:

- Editor's draft: <https://w3c.github.io/mathml-core/>
- Published TR: <https://www.w3.org/TR/mathml-core/>
- MathJax "Convert Mathvariant to Unicode" filter example: <https://docs.mathjax.org/en/v4.0/advanced/synchronize/filters.html#convert-mathvariant-to-unicode>

### 1. `mathvariant` は依然として中心手段ではない

最新 draft でも、`mathvariant` 属性は `<mi>` の自動 italic を打ち消す用途でのみ使われる、という整理がかなり明確です。

それ以外の style/variant については、Unicode の Mathematical Alphanumeric Symbols を使うべきとされています。

これは次のような TeX マクロに直接関係します。

- `\mathbb`
- `\mathbf`
- `\mathcal`
- `\mathfrak`

このプロジェクトへの含意は明確です。

- `\mathbb` を Unicode 化している現在の実装方針は正しい
- それ以外の variant はまだ legacy `mathvariant` に依存しているため、strict Core 寄りとは言えない

## variant ごとの現状

### `\mathbb`

現在の挙動:

- `\mathbb{R}` は `ℝ` のような Unicode double-struck 文字になる
- `mathvariant="double-struck"` は残さない

ここは現行実装の中で最も MathML Core 寄りの部分です。

### `\mathbf`, `\mathcal`, `\mathfrak` など

現在の挙動:

- `mathvariant="bold"`
- `mathvariant="script"`
- `mathvariant="fraktur"`

のような legacy 値をそのまま出します。

これは Presentation MathML としては自然ですが、strict MathML Core という意味ではまだ途中です。

## Core element subset と MathJax 出力

MathML Core の element list は意図的に狭く保たれています。

そのため、MathJax ベースの broader Presentation MathML は、MathML としては自然でも Core subset を超えることがあります。

このプロジェクトで重要な例は次です。

- `\cancel` は `<menclose>` を出しうる
- `\tag` は `<mlabeledtr>` を出しうる

これは「間違い」ではありません。

意味としては次のとおりです。

- `texPackages` は TeX parser / macro の制御 option
- 出力を MathML Core subset に制限する option ではない

## `texPackages` の正しい意味

`texPackages` は、その `MarkdownIt` instance で有効にする MathJax TeX package を制御します。

つまり本質は、

- parser strictness
- macro availability
- package-level behavior control

です。

逆に、次の意味ではありません。

- Core-only output mode
- strict MathML subset switch

ここは利用者が誤解しやすいので、docs では常に分けて説明するべきです。

## CSS との関係

最新 draft では、`<math>` に対する UA stylesheet もかなり明示されています。たとえば次のような値です。

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

これは、このプロジェクトの author-level baseline CSS が大筋で正しい方向にあることを裏づけています。

ただし project の stylesheet は Core UA stylesheet の単純な写しではありません。実際には次の役割も兼ねています。

- consumer 向けの baseline theme
- prose typography leakage を止める firewall
- browser workaround

したがって説明としては、

- MathML Core に着想を得た baseline CSS

が最も正確で、

- MathML Core UA stylesheet の完全な再現

ではありません。

## 現在のプロジェクトの適切な表現

現時点で最も正確な短い説明は次です。

- MathJax を使って MathML または SVG を出す markdown-it plugin
- default MathML output は explicit variant 正規化を含む browser-oriented Presentation MathML
- ただし browser/Core compatibility のための hardening を一部加えている
- まだ strict MathML Core emitter ではない

## 現在の MathML mode

現在は、raw MathML の契約と report を次の 2 つに分けています。

- `mathmlMode: 'browser'`
- `mathmlMode: 'mathjax'`
- `mathmlReport: true`

### `mathmlMode: 'browser'`

これが default です。

この mode は、シリアライズ前に **明示的な variant マクロ由来の token** を中心に、Unicode 正規化を行います。

ここで言う「明示的な variant マクロ由来」とは、たとえば次のようなものです。

- `\mathbf{x}`
- `\mathit{x}`
- `\mathcal{A}`
- `\mathfrak{g}`

逆に、単なる `$x$` のような通常の識別子は、explicit variant intent を持たないので変換対象にしません。

実装方針は、MathJax 公式の
"Convert Mathvariant to Unicode" filter example と同じ方向です。

- 可能なものは Unicode Mathematical Alphanumeric Symbols を使う
- Core で有効な単一文字 `mi` の `mathvariant="normal"` は残す
- 変換できた token からは legacy `mathvariant` / `data-mjx-variant` を外す
- Unicode 化できない記号については、CSS で近似できるものだけ `style` fallback を足す
- Unicode 化も CSS fallback も安全にできない場合は、元の legacy variant markup を保持する
- plain な識別子は、明示的な variant 指定に由来しない限り変換しない

出典と provenance:

- 公式 docs ページ:
  <https://docs.mathjax.org/en/v4.0/advanced/synchronize/filters.html#convert-mathvariant-to-unicode>
- MathJax documentation repository:
  <https://github.com/mathjax/MathJax-docs>
- MathJax source package:
  <https://github.com/mathjax/MathJax-src>

大事な整理:

- この project は、その filter を npm/runtime helper として import しているわけではありません
- 代わりに、同じ mapping 方針を plugin 内にローカル実装しています
- Unicode range table と style fallback の考え方は公式例から adapt したもので、この repository 側で test と docs に固定しています

ライセンスについて:

- MathJax とその documentation は Apache-2.0
- この repository では、この docs と source comment に attribution を残しています
- 現在の実装は docs のコードを runtime dependency として使うものではなく、adapt した project-local implementation です

例:

- `\mathbf{E}` -> `𝐄`
- `\mathcal{A}` -> `𝒜︀`
- `\mathit{h}` -> `ℎ`
- `\mathbf{+}` -> `mathvariant="bold"` を残しつつ plain `+` に `style="font-weight: bold"` を追加
- plain `x` -> plain `x` のまま

この fallback は intentionally 限定的です。
Unicode 化できず、かつ MathJax 公式例でも妥当な CSS 近似が示されている場合だけ使います。
この場合でも legacy `mathvariant` 属性自体は残し、現在の browser が使えるように presentational style を追加します。将来 browser 側の対応が進んだときにも、その属性情報を失わないためです。
つまり interoperability のための近似であって、完全に同じ typographic result を保証するものではありません。

逆に、Unicode 化も CSS fallback もできない場合は、元の legacy variant markup を残して residual issue として報告します。
たとえば `\mathbb{+}` を plain `+` へ silently downgrade するようなことはしません。

ただし、これでも output 全体が strict MathML Core subset になるわけではありません。

たとえば:

- `<menclose>` のような Core 外 element はそのまま残る
- すべての TeX construct が pure Unicode/Core form に落とせるわけではない

なぜ browser mode はここで止めているのか:

- `<menclose>` は単なる font-variant 問題ではなく、構造や notation 自体の rewrite が必要になる
- `\tag` 由来の `<mlabeledtr>` も、単純な token-level variant rewrite ではない
- これらを無理に Core っぽい別 markup に落とすと、layout を壊したり semantics を弱めたり、別の互換性問題を作りやすい

そのため、現在の設計は次のように割り切っています。

- token-level の math variant だけ、Unicode/Core story が明確な範囲で正規化する
- より広い Core 外 construct は report に残す
- reject や alternative rendering は将来の strict mode / SVG-oriented mode に任せる

### `mathmlMode: 'mathjax'`

これが opt-out mode です。

この mode は project 側の正規化を行わず、MathJax の broader Presentation MathML serialization により近い output を返します。

つまり:

- legacy `mathvariant` を維持する
- `\mathbf`, `\mathcal`, `\mathfrak`, `\mathbb` なども MathJax 寄りの raw Presentation MathML のままにする
- `<menclose>` や `<mlabeledtr>` のような non-Core structure もそのまま残す

### `mathmlReport`

`mathmlReport: true` を付けると、選択した mode の最終 MathML に対する interoperability finding を `env.mathmlReport` に書き込みます。

現在の issue type は次です。

- `non-core-element`
- `legacy-mathvariant`
- `style-fallback-mathvariant`
- `unsupported-mathvariant`
- `unconverted-mathvariant`

つまり:

- `mathmlMode: 'browser'` では residual な non-Core / fallback case が主に残る
- `mathmlMode: 'mathjax'` では broader な legacy `mathvariant` も report に出る

`tag` はこの方針の典型です。
`\tag` は `<mlabeledtr>` のような構造を作るので、どちらの MathML mode でも HTML/MathML 構造は変わりません。
variant のような token-level rewrite の対象ではない、という扱いです。

`cancel` family も同様に `<menclose>` のまま残ります。
この project は raw MathML 用に `<menclose>` を CSS で描き足すことまでは標準では行いません。
確実な見た目が必要なら SVG を優先してください。

browser mode 固有の issue としては現在次がありえます。

- `style-fallback-mathvariant`
- `unsupported-mathvariant`
- `unconverted-mathvariant`

例:

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

補足:

- report は render ごとに初期化される
- 問題が見つからなかった式は配列に入らない
- `useSvg: true` のときは現在この option は実質無視され、report は空のまま

## 次に価値が高い改善

次に本当に価値が高い改善は、もう report mode 自体ではなく、次の 4 点です。

1. browser mode を public default contract として固定するか決める
2. MathJax と MathML Core の両方に明確な根拠がある variant だけをさらに広げる
3. その後に strict mode を検討する
4. 並行して、native MathML では吸収しづらいケースのために SVG / browser rendering 側の堅牢性を上げる

この順なら、現在の broad compatibility を壊さずに、Core 寄りの用途をさらに明示的に支えられます。
