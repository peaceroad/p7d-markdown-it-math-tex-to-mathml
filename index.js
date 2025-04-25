import { mathjax } from 'mathjax-full/js/mathjax.js'

/* // MathJax@4
import { TeX } from 'mathjax-full/mjs/input/tex.js'
import { HTMLDocument } from 'mathjax-full/mjs/handlers/html/HTMLDocument.js'
import { liteAdaptor } from 'mathjax-full/mjs/adaptors/liteAdaptor.js'
import { STATE } from 'mathjax-full/mjs/core/MathItem.js'
import { SerializedMmlVisitor } from 'mathjax-full/mjs/core/MmlTree/SerializedMmlVisitor.js'

import {source} from 'mathjax-full/components/mjs/source.js';
const convertMathToMathML = (texCont, display) => {
  const load = Object.keys(source).filter((name) => name.substring(0,6) === '[tex]/').sort();
  console.log(load)
  const packages = ['base'].concat(load.map((name) => name.substring(6)));
  console.log(packages)
  const tex = new TeX({ packages: [...packages]})
  const html = new HTMLDocument('', liteAdaptor(), { InputJax: tex });
  const visitor = new SerializedMmlVisitor();
  const toMathML = (node) => visitor.visitTree(node, html);
  let mathML = toMathML(html.convert(texCont || '', {display: display, end: STATE.CONVERT }))
  return mathML
}
*/
// MathJax@3
import { TeX } from 'mathjax-full/js/input/tex.js'
import { HTMLDocument } from 'mathjax-full/js/handlers/html/HTMLDocument.js'
import { liteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor.js'
import { STATE } from 'mathjax-full/js/core/MathItem.js'
import { AllPackages } from 'mathjax-full/js/input/tex/AllPackages.js'
import { SerializedMmlVisitor } from 'mathjax-full/js/core/MmlTree/SerializedMmlVisitor.js'

import { SVG } from 'mathjax-full/js/output/svg.js'
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js'
import {AssistiveMmlHandler} from 'mathjax-full/js/a11y/assistive-mml.js'

const useMathSvg  = false

const convertMathToMathML = (texCont, display) => {
  if (useMathSvg) {
    const adaptor = liteAdaptor();
    const handler = RegisterHTMLHandler(adaptor);
    //AssistiveMmlHandler(handler);
    const packages = AllPackages.filter((name) => name !== 'bussproofs')
    const tex = new TeX({ packages: [...packages]})
    const svg = new SVG({fontCache: 'local', scale: 1});
    const html = mathjax.document('', {InputJax: tex, OutputJax: svg});
    const node = html.convert(texCont || '', {
      display: display,
      em: 16,
      ex: 8,
      containerWidth: 680,
    })
    let svgCont = adaptor.outerHTML(node)
    if (display) svgCont += '\n'
    //console.log(svgCont)
    return svgCont
  } else {
    const packages = AllPackages.filter((name) => name !== 'bussproofs');
    //const tex = new TeX({ packages: [...packages], tags: 'ams'})
    //console.log(packages)
    const tex = new TeX({ packages: [...packages]})
    const html = new HTMLDocument('', liteAdaptor(), { InputJax: tex });
    const visitor = new SerializedMmlVisitor();
    const toMathML = (node) => visitor.visitTree(node, html);
    let mathML = toMathML(html.convert(texCont || '', { display: display, end: STATE.CONVERT }))
    //const hasMlabeledtr = mathMLCont.match(/(<math[^>]*?)>\s*?<mtable[^>]*?>\s*?<mlabeledtr[^>]*?>\s*?<mtd[^>]*?>\s*?<mtext>(.*?)<\/mtext>\s*?<\/mtd>\s*?<mtd>\s*?(\S[\S\s]*?)\s*?<\/mtd>\s*?<\/mlabeledtr>\s*?<\/mtable>\s*?<\/math>/)
    //if (!hasMlabeledtr) return mathML
    //mathML = hasMlabeledtr[1] + ' aria-label="' + hasMlabeledtr[2] + '">\n' + hasMlabeledtr[3] + '\n</math>'
    return mathML
  }
}

const mditMathTexToMathML = (md) => {

  md.block.ruler.after('blockquote', 'math_block', (state, startLine, endLine, silent) => {
    if (silent) { return false; }
    let nextLine = startLine + 1;
    const startPos = state.bMarks[startLine] + state.tShift[startLine];
    const endPos = state.eMarks[startLine];
    const firstLine = state.src.slice(startPos, endPos).trim();

    //console.log('firstLine: ' + firstLine)
    let hasStartMathMark = firstLine === '$$'
    let isOneLineMathBlock = firstLine.length > 4 && firstLine.startsWith('$$') && firstLine.endsWith('$$')
    //console.log('hasStartMathMark: ' + hasStartMathMark + ' isOneLineMathBlock: ' + isOneLineMathBlock)

    if (!hasStartMathMark && !isOneLineMathBlock) return false

    if (hasStartMathMark) {
      while (nextLine < endLine) {
        if (state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine]).trim() === '$$') {
          break
        }
        nextLine++
      }
      if (nextLine >= endLine) return false
      const content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false)
      const mathML = convertMathToMathML(content, true) + '\n'
      state.line = nextLine + 1
      state.tokens.push({
        type: 'html_block',
        content: mathML,
        block: true,
        level: state.level,
      })
      return true
    }

    if (isOneLineMathBlock) {
      const content = firstLine.slice(2, -2).trim()
      const mathML = convertMathToMathML(content, true) + '\n'
      state.line = startLine + 1
        state.tokens.push({
        type: 'html_block',
        content: mathML,
        block: true,
        level: state.level,
      })
      return true
    }
  })


  md.inline.ruler.push('math_inline', (state, silent) => {
    const start = state.pos;
    if (state.src.charAt(start) !== '$' || state.src.length < 3) return false
    if (state.src.charAt(start + 1) === '$') return false
    /*if (state.src.charAt(start + 1) === '$') {
      if (!silent) {
        const token = state.push('text', '', 0)
        token.content = '$$'
      }
      state.pos = start + 2
      return true
    }*/

    const end = state.src.indexOf('$', start + 1);
    if (end === -1) return false;

    if (!silent) {
        const content = state.src.slice(start + 1, end);
        const token = state.push('math_inline', 'math', 0);
        token.content = convertMathToMathML(content, false);
        token.markup = '$';
    }
    state.pos = end + 1;
    return true;
  })

  md.renderer.rules.math_inline = (tokens, idx) => {
    return tokens[idx].content;
  }
}

export default mditMathTexToMathML