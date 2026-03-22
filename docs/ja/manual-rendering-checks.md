# Manual Rendering Checks

この文書は、このプロジェクトの rendering fixture を使ってブラウザ描画を手動確認するための手順書です。

特に iOS / WebKit で native MathML を確認するときのチェックリストとして使います。

## fixture ページ

rendering fixture の source は:

- `example/src/example-rendering-check.md`

推奨の確認ページは:

- `example/generated/compare/example-rendering-check-compare.html`
- `example/generated/compare/example-rendering-check-mode-compare.html`

その他の single-view HTML は `example/generated/pages/` にあり、直接確認用か compare ページの iframe source です。

生成スクリプトは:

- `example/build-examples.js`

fixture を更新したら、次で HTML を再生成します。

```sh
node example/build-examples.js
```

## 推奨チェック順

1. まず通常の自動テストを回す。
2. fixture source を編集した場合は example HTML を再生成する。
3. 対象 browser で rendering check ページを開く。
4. 同じ式で MathML と SVG を比較する。
5. variant 系の見え方を評価したい場合は default MathML と `mathmlMode: 'mathjax'` も比較する。
6. iOS Safari で問題が出る場合は通常表示と Reader mode を比較する。

## 確認項目

### 1. 関数名っぽい識別子の直後の `(`

最重要の regression target:

- `\text{MSA}(LN)`
- `\operatorname{MSA}(LN)`
- 同種の `\text{word}(` / `\operatorname{word}(`

見るポイント:

- 開き括弧 `(` が直前の文字に重なっていないか
- inline / display の両方で許容できる見え方か

SVG が正しく、MathML だけ崩れているなら、まずは TeX parser より browser-native MathML rendering を疑います。

### 2. variant 表示

代表例として次を見ます。

- `\mathbb`
- `\mathbf`
- `\mathcal`
- `\mathfrak`

ここは主に視覚上の sanity check です。serialize された output contract 自体は別の自動テストで固定しています。
default MathML と `mathmlMode: 'mathjax'` の比較では、
explicit variant マクロ由来の glyph 差がどこまで縮まるかを見ます。

### 3. broad package 由来の construct

次のような例も見ます。

- `\cancel{x}`
- `\tag{1} x`

これは default output が strict MathML Core より広い、という current contract を視覚的にも確認しやすくするためです。

### 4. Safari Reader mode 比較

iOS Safari で崩れが見えたら:

- 通常表示
- Reader mode

を比較します。

Reader mode では正しく見えるなら、TeX parser より先に page CSS / typography interaction を疑うのが効率的です。

## 不具合を見つけたときに残す情報

最低限、次は残します。

- browser と version
- device / OS
- どの fixture page で見たか
- MathML のみか、SVG のみか、両方か
- Safari Reader mode で変化するか

この程度を残しておくだけで、後から同種の regression を比較しやすくなります。
