import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { TeX } from '@mathjax/src/mjs/input/tex.js'
import { HTMLDocument } from '@mathjax/src/mjs/handlers/html/HTMLDocument.js'
import { liteAdaptor } from '@mathjax/src/mjs/adaptors/liteAdaptor.js'
import { STATE } from '@mathjax/src/mjs/core/MathItem.js'
import { SerializedMmlVisitor } from '@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js'

import { SVG } from '@mathjax/src/mjs/output/svg.js'
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js'

const STRIP_DATA_ATTRS_RE = /\sdata-(?:latex(?:-item)?|mjx-[a-z0-9_-]+|semantic-[a-z0-9_-]+|break-align|mml-node|c|cramped|speech-node)="[^"]*"/gi
const PRIME_MO_CONTENT = new Set([
  '\u2032', // U+2032 PRIME
  '\u2033', // U+2033 DOUBLE PRIME
  '\u2034', // U+2034 TRIPLE PRIME
  '\u2057', // U+2057 QUADRUPLE PRIME
])
const MSUP_BAR_MO_CONTENT = new Set(['|'])
const MSUBSUP_INTEGRAL_MO_CONTENT = new Set([
  '\u222B', // U+222B INTEGRAL
])
const DEFAULT_PRIME_CLASS = 'math-layout-prime'
const DEFAULT_MSUP_BAR_CLASS = 'math-layout-msup-bar'
const DEFAULT_INTEGRAL_CLASS = 'math-layout-integral'
const SVG_FONTS = Object.freeze({
  newcm: {
    module: '@mathjax/mathjax-newcm-font/js/svg.js',
    exportName: 'MathJaxNewcmFont',
  },
  stix2: {
    module: '@mathjax/mathjax-stix2-font/js/svg.js',
    exportName: 'MathJaxStix2Font',
  },
  pagella: {
    module: '@mathjax/mathjax-pagella-font/js/svg.js',
    exportName: 'MathJaxPagellaFont',
  },
  termes: {
    module: '@mathjax/mathjax-termes-font/js/svg.js',
    exportName: 'MathJaxTermesFont',
  },
})

const normalizeSvgFontName = (value) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  let name = trimmed.toLowerCase()
  if (name.startsWith('@mathjax/')) {
    name = name.slice('@mathjax/'.length)
  }
  if (name.startsWith('mathjax-')) {
    name = name.slice('mathjax-'.length)
  }
  if (name.endsWith('-font')) {
    name = name.slice(0, -'-font'.length)
  }
  return name
}

const resolveSvgFontName = (value) => {
  const normalized = normalizeSvgFontName(value)
  if (!normalized) return null
  return normalized in SVG_FONTS ? normalized : null
}

const normalizeClassList = (value) => {
  if (typeof value !== 'string') return []
  return value.split(/\s+/).filter(Boolean)
}

const resolveClassName = (value, defaultName) => {
  if (value === true) return defaultName
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const splitLayoutClassString = (value) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const resolveMathmlLayoutClass = (value) => {
  if (!value) {
    return { primeClass: null, msupBarClass: null, integralClass: null }
  }
  if (value === true) {
    return {
      primeClass: DEFAULT_PRIME_CLASS,
      msupBarClass: DEFAULT_MSUP_BAR_CLASS,
      integralClass: DEFAULT_INTEGRAL_CLASS,
    }
  }
  if (typeof value === 'string') {
    const [prime, msupBar, integral] = splitLayoutClassString(value)
    return {
      primeClass: resolveClassName(prime, DEFAULT_PRIME_CLASS),
      msupBarClass: resolveClassName(msupBar, DEFAULT_MSUP_BAR_CLASS),
      integralClass: resolveClassName(integral, DEFAULT_INTEGRAL_CLASS),
    }
  }
  if (typeof value !== 'object') {
    return { primeClass: null, msupBarClass: null, integralClass: null }
  }
  return {
    primeClass: resolveClassName(value.prime, DEFAULT_PRIME_CLASS),
    msupBarClass: resolveClassName(value.msupBar, DEFAULT_MSUP_BAR_CLASS),
    integralClass: resolveClassName(value.integral, DEFAULT_INTEGRAL_CLASS),
  }
}

const appendClassAttribute = (node, className) => {
  const additions = normalizeClassList(className)
  if (additions.length === 0) return
  const attributes = node?.attributes
  if (!attributes) return
  const current = attributes.get('class') || ''
  const existing = normalizeClassList(current)
  let changed = false
  for (const cls of additions) {
    if (!existing.includes(cls)) {
      existing.push(cls)
      changed = true
    }
  }
  if (changed) {
    attributes.set('class', existing.join(' '))
  }
}

const applyMathmlClassMap = (node, classMap) => {
  const { primeClass, msupBarClass, integralClass } = classMap
  if (!primeClass && !msupBarClass && !integralClass) return
  node.walkTree((current) => {
    if (primeClass && current.kind === 'mo') {
      const text = current.getText().trim()
      if (PRIME_MO_CONTENT.has(text)) {
        appendClassAttribute(current, primeClass)
      }
    }
    if (msupBarClass && current.kind === 'msup') {
      const base = current.childNodes?.[0]
      const sup = current.childNodes?.[1]
      if (base?.kind === 'mo' && sup?.kind === 'mn') {
        const text = base.getText().trim()
        if (MSUP_BAR_MO_CONTENT.has(text)) {
          appendClassAttribute(current, msupBarClass)
        }
      }
    }
    if (integralClass && current.kind === 'msubsup') {
      const base = current.childNodes?.[0]
      if (base?.kind === 'mo') {
        const text = base.getText().trim()
        if (MSUBSUP_INTEGRAL_MO_CONTENT.has(text)) {
          appendClassAttribute(current, integralClass)
        }
      }
    }
  })
}

const stripMathJaxDataAttrs = (markup, shouldStrip) => {
  if (!shouldStrip || !markup.includes('data-')) return markup
  // Drop MathJax-generated metadata (data-latex/latex-item/mjx-*/semantic-*/break-align/mml-node/c),
  // while leaving unrelated data-* attributes intact.
  return markup.replace(STRIP_DATA_ATTRS_RE, '')
}

const compactMathML = (markup) => markup.replace(/>\s+</g, '><').trim()

const createMathTexToMathML = ({ texPackages, resolveSvgFontModule } = {}) => {
  const packages = Array.isArray(texPackages) && texPackages.length ? texPackages : ['base']

  const mathmlContext = (() => {
    const adaptor = liteAdaptor()
    const tex = new TeX({ packages })
    const html = new HTMLDocument('', adaptor, { InputJax: tex })
    const visitor = new SerializedMmlVisitor()
    return { html, visitor }
  })()

  const svgContext = (() => {
    const adaptor = liteAdaptor()
    RegisterHTMLHandler(adaptor)
    const tex = new TeX({ packages })
    return { adaptor, tex }
  })()

  const resolveSvgFontData = (value) => {
    if (!value) return null
    if (typeof value !== 'string') return value
    const resolved = resolveSvgFontName(value)
    if (!resolved) {
      throw new Error(`Unknown SVG font name: ${value}`)
    }
    if (!resolveSvgFontModule) {
      throw new Error('svgFont name resolution is only available in Node.js. Import the font class and pass it via svgFont in browser/bundler environments.')
    }
    const { module: modulePath, exportName } = SVG_FONTS[resolved]
    const mod = resolveSvgFontModule(modulePath)
    const fontData = mod?.[exportName]
    if (!fontData) {
      throw new Error(`SVG font export '${exportName}' was not found in ${modulePath}`)
    }
    return fontData
  }

  const createSvgDocument = (options) => {
    const { adaptor, tex } = svgContext
    const svgFontData = resolveSvgFontData(options.svgFont)
    const svgScale = Number.isFinite(options.svgScale) ? options.svgScale : 1
    const svgOptions = {
      fontCache: options.svgFontCache,
      scale: svgScale,
    }
    if (svgFontData) {
      svgOptions.fontData = svgFontData
    }
    const linebreaks = options.svgLinebreaks
    const hasLinebreaks = linebreaks
      && typeof linebreaks === 'object'
      && !Array.isArray(linebreaks)
      && Object.keys(linebreaks).length > 0
    if (hasLinebreaks) {
      svgOptions.linebreaks = linebreaks
    }
    if (options.svgFontPath) {
      svgOptions.fontPath = options.svgFontPath
    }
    const svg = new SVG(svgOptions)
    const html = mathjax.document('', { InputJax: tex, OutputJax: svg })
    return { adaptor, html }
  }

  const mditMathTexToMathML = (md, options = {}) => {
    const normalizedOptions = {
      ...options,
      setMathJaxDataAttrs: options.setMathJaxDataAttrs ?? false,
      mathmlLayoutClass: options.mathmlLayoutClass ?? '',
      svgFont: options.svgFont ?? '',
      svgFontCache: options.svgFontCache ?? 'local',
      svgLinebreaks: options.svgLinebreaks ?? {},
      svgFontPath: options.svgFontPath ?? '',
    }
    const stripMathJaxData = normalizedOptions.setMathJaxDataAttrs === false
    const compactInline = options.compactInlineMathML === true
    const compactBlock = options.compactBlockMathML === true
    const useSvg = options.useSvg === true
    const { primeClass, msupBarClass, integralClass } = resolveMathmlLayoutClass(normalizedOptions.mathmlLayoutClass)
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
      const svgDocument = createSvgDocument(normalizedOptions)
      const convertSvg = (texContent, convertOptions) => {
        const { adaptor, html } = svgDocument
        const node = html.convert(texContent || '', convertOptions)
        html.clear()
        const svgCont = adaptor.outerHTML(node)
        return stripMathJaxDataAttrs(svgCont, stripMathJaxData)
      }
      convertInline = (texContent) => convertSvg(texContent, svgInlineOptions)
      convertBlock = (texContent) => convertSvg(texContent, svgBlockOptions)
    } else {
      const { html, visitor } = mathmlContext
      const convertMathML = (texContent, convertOptions, shouldCompact) => {
        const mmlNode = html.convert(texContent || '', convertOptions)
        if (primeClass || msupBarClass || integralClass) {
          applyMathmlClassMap(mmlNode, { primeClass, msupBarClass, integralClass })
        }
        const mathML = visitor.visitTree(mmlNode)
        html.clear()
        const stripped = stripMathJaxDataAttrs(mathML, stripMathJaxData)
        return shouldCompact ? compactMathML(stripped) : stripped
      }
      convertInline = (texContent) => convertMathML(texContent, mathmlInlineOptions, compactInline)
      convertBlock = (texContent) => convertMathML(texContent, mathmlBlockOptions, compactBlock)
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

      const pushMathToken = (content, start, end) => {
        const mathML = convertBlock(content) + '\n'
        state.line = end
        const token = state.push('html_block', '', 0)
        token.content = mathML
        token.block = true
        token.map = [start, end]
        token.level = state.level
      }

      if (hasStartMathMark) {
        while (nextLine < endLine) {
          if (state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine]).trim() === '$$') {
            break
          }
          nextLine++
        }
        if (nextLine >= endLine) return false
        const content = state.getLines(startLine + 1, nextLine, state.tShift[startLine], false)
        pushMathToken(content, startLine, nextLine + 1)
        return true
      }

      if (isOneLineMathBlock) {
        const content = firstLine.slice(2, -2).trim()
        pushMathToken(content, startLine, startLine + 1)
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

    md.renderer.rules.math_inline = (tokens, idx) => tokens[idx].content
  }

  return mditMathTexToMathML
}

export default createMathTexToMathML
