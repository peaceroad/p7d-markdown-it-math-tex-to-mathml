# p7d-markdown-it-math-tex-to-mathml

p7d-markdown-it-math-tex-to-mathml is a markdown-it plugin that converts TeX-formatted math expressions (inline $...$ and block $$...$$) in Markdown to MathML.


## Install

```
npm install p7d-markdown-it-math-tex-to-mathml mathjax-full
```

## Use

```js
import mdit from 'markdown-it'
import mditMathTexToMathml from 'p7d-markdown-it-math-tex-to-mathml'

const md = mdit({ html: true }).use(mditMathTexToMathml)
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
