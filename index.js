import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { TeX } from '@mathjax/src/mjs/input/tex.js'
import { HTMLDocument } from '@mathjax/src/mjs/handlers/html/HTMLDocument.js'
import { liteAdaptor } from '@mathjax/src/mjs/adaptors/liteAdaptor.js'
import { STATE } from '@mathjax/src/mjs/core/MathItem.js'
import { SerializedMmlVisitor } from '@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js'

import { SVG } from '@mathjax/src/mjs/output/svg.js'
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js'
import { source } from '@mathjax/src/components/mjs/source.js'

const STRIP_DATA_ATTRS_RE = /\sdata-(?:latex(?:-item)?|mjx-[a-z0-9_-]+|semantic-[a-z0-9_-]+|break-align|mml-node|c)="[^"]*"/gi

const texExtensionNames = Object.keys(source)
  .filter((name) => name.startsWith('[tex]/'))
  .map((name) => name.substring(6))
  .filter((name) => name !== 'bussproofs')

const texPackages = ['base', ...texExtensionNames]

const texPackageImports = texExtensionNames.map(
  (name) => `@mathjax/src/components/mjs/input/tex/extensions/${name}/${name}.js`
)

// Load MathJax v4 TeX extensions so synchronous conversion works the same way
// it did with the bundled v3 list.
await Promise.all(texPackageImports.map((specifier) => import(specifier)))

// Shared converters to avoid recreating adaptors and visitors on every call.
const mathmlContext = (() => {
  const adaptor = liteAdaptor()
  const tex = new TeX({ packages: texPackages })
  const html = new HTMLDocument('', adaptor, { InputJax: tex })
  const visitor = new SerializedMmlVisitor()
  return { html, visitor }
})()

const svgContext = (() => {
  const adaptor = liteAdaptor()
  RegisterHTMLHandler(adaptor)
  const tex = new TeX({ packages: texPackages })
  return { adaptor, tex }
})()

const createSvgDocument = (options) => {
  const { adaptor, tex } = svgContext
  const svgOptions = {
    fontCache: options.fontCache || 'local',
    scale: 1,
  }
  if (options.svgFont) {
    svgOptions.fontData = options.svgFont
  }
  if (options.linebreaks) {
    svgOptions.linebreaks = options.linebreaks
  }
  if (options.fontPath) {
    svgOptions.fontPath = options.fontPath
  }
  const svg = new SVG(svgOptions)
  const html = mathjax.document('', { InputJax: tex, OutputJax: svg })
  return { adaptor, html }
}

const removeMathJaxData = (markup, shouldRemove) => {
  if (!shouldRemove || !markup.includes('data-')) return markup
  // Drop MathJax-generated metadata (data-latex/latex-item/mjx-*/semantic-*/break-align/mml-node/c),
  // while leaving unrelated data-* attributes intact.
  return markup.replace(STRIP_DATA_ATTRS_RE, '')
}

const compactMathML = (markup) => markup.replace(/>\s+</g, '><').trim()

const mditMathTexToMathML = (md, options = {}) => {
  // Back-compat: accept legacy stripMathJaxData/stripDataAttributes; prefer removeMathJaxData.
  const removeAttrs =
    (options.removeMathJaxData ?? options.stripMathJaxData ?? options.stripDataAttributes) === true
  const compact = options.compactMathML === true
  const useSvg = options.useSvg === true
  const em = Number.isFinite(options.em) ? options.em : 16
  const ex = Number.isFinite(options.ex) ? options.ex : 8
  const containerWidth = Number.isFinite(options.containerWidth) ? options.containerWidth : 680
  const svgInlineOptions = { display: false, em, ex, containerWidth }
  const svgBlockOptions = { display: true, em, ex, containerWidth }
  const mathmlInlineOptions = { display: false, end: STATE.CONVERT, em, ex, containerWidth }
  const mathmlBlockOptions = { display: true, end: STATE.CONVERT, em, ex, containerWidth }

  let convertInline
  let convertBlock
  if (useSvg) {
    const svgDocument = createSvgDocument(options)
    const convertSvg = (texContent, convertOptions) => {
      const { adaptor, html } = svgDocument
      const node = html.convert(texContent || '', convertOptions)
      html.clear()
      const svgCont = adaptor.outerHTML(node)
      return removeMathJaxData(svgCont, removeAttrs)
    }
    convertInline = (texContent) => convertSvg(texContent, svgInlineOptions)
    convertBlock = (texContent) => convertSvg(texContent, svgBlockOptions)
  } else {
    const { html, visitor } = mathmlContext
    const convertMathML = (texContent, convertOptions) => {
      const mathML = visitor.visitTree(
        html.convert(texContent || '', convertOptions),
        html
      )
      html.clear()
      const stripped = removeMathJaxData(mathML, removeAttrs)
      return compact ? compactMathML(stripped) : stripped
    }
    convertInline = (texContent) => convertMathML(texContent, mathmlInlineOptions)
    convertBlock = (texContent) => convertMathML(texContent, mathmlBlockOptions)
  }

  md.block.ruler.after('blockquote', 'math_block', (state, startLine, endLine, silent) => {
    if (silent) return false
    let nextLine = startLine + 1
    const startPos = state.bMarks[startLine] + state.tShift[startLine]
    const endPos = state.eMarks[startLine]
    const firstLine = state.src.slice(startPos, endPos).trim()

    const hasStartMathMark = firstLine === '$$'
    const isOneLineMathBlock = firstLine.length > 4 && firstLine.startsWith('$$') && firstLine.endsWith('$$')

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
      const mathML = convertBlock(content) + '\n'
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
      const mathML = convertBlock(content) + '\n'
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
    const start = state.pos
    if (state.src.charAt(start) !== '$' || state.src.length < 3) return false
    if (state.src.charAt(start + 1) === '$') return false
    const end = state.src.indexOf('$', start + 1)
    if (end === -1) return false

    if (!silent) {
      const content = state.src.slice(start + 1, end)
      const token = state.push('math_inline', 'math', 0)
      token.content = convertInline(content)
      token.markup = '$'
    }
    state.pos = end + 1
    return true
  })

  md.renderer.rules.math_inline = (tokens, idx) => {
    return tokens[idx].content;
  }
}

export default mditMathTexToMathML
