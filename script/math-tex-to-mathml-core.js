import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { TeX } from '@mathjax/src/mjs/input/tex.js'
import { HTMLDocument } from '@mathjax/src/mjs/handlers/html/HTMLDocument.js'
import { liteAdaptor } from '@mathjax/src/mjs/adaptors/liteAdaptor.js'
import { STATE } from '@mathjax/src/mjs/core/MathItem.js'
import { SerializedMmlVisitor } from '@mathjax/src/mjs/core/MmlTree/SerializedMmlVisitor.js'

import { SVG } from '@mathjax/src/mjs/output/svg.js'
import { RegisterHTMLHandler } from '@mathjax/src/mjs/handlers/html.js'

const STRIP_DATA_ATTRS_RE = /\sdata-(?:latex(?:-item)?|mjx-[a-z0-9_-]+|semantic-[a-z0-9_-]+|break-align|mml-node|c|cramped|speech-node)="[^"]*"/gi
const COMPACT_MATHML_RE = />\s+</g
const DOLLAR_CHAR_CODE = 0x24
const MDIT_INSTALL_STATE = Symbol('math-tex-to-mathml.installState')
const PRIME_TRIGGER_RE = /'|\\prime\b|[\u2032\u2033\u2034\u2057]/
const MSUP_BAR_TRIGGER_RE = /\||\\(?:vert|lvert|rvert)\b/
const INTEGRAL_TRIGGER_RE = /\\int(?:op)?\b|\u222B/
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

const appendClassAttribute = (node, additions) => {
  if (additions.length === 0) return
  const attributes = node?.attributes
  if (!attributes) return
  const current = attributes.get('class') || ''
  if (!current) {
    attributes.set('class', additions.join(' '))
    return
  }
  const existing = new Set(normalizeClassList(current))
  let changed = false
  for (const cls of additions) {
    if (!existing.has(cls)) {
      existing.add(cls)
      changed = true
    }
  }
  if (changed) {
    attributes.set('class', Array.from(existing).join(' '))
  }
}

const applyMathmlClassMap = (node, classMap) => {
  const { primeClasses, msupBarClasses, integralClasses } = classMap
  if (!primeClasses && !msupBarClasses && !integralClasses) return
  node.walkTree((current) => {
    if (primeClasses && current.kind === 'mo') {
      const text = current.getText().trim()
      if (PRIME_MO_CONTENT.has(text)) {
        appendClassAttribute(current, primeClasses)
      }
    }
    if (msupBarClasses && current.kind === 'msup') {
      const base = current.childNodes?.[0]
      const sup = current.childNodes?.[1]
      if (base?.kind === 'mo' && sup?.kind === 'mn') {
        const text = base.getText().trim()
        if (MSUP_BAR_MO_CONTENT.has(text)) {
          appendClassAttribute(current, msupBarClasses)
        }
      }
    }
    if (integralClasses && current.kind === 'msubsup') {
      const base = current.childNodes?.[0]
      if (base?.kind === 'mo') {
        const text = base.getText().trim()
        if (MSUBSUP_INTEGRAL_MO_CONTENT.has(text)) {
          appendClassAttribute(current, integralClasses)
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

const compactMathML = (markup) => markup.replace(COMPACT_MATHML_RE, '><').trim()

const normalizeMathmlClassMap = (value) => {
  const { primeClass, msupBarClass, integralClass } = resolveMathmlLayoutClass(value)
  return {
    primeClasses: primeClass ? normalizeClassList(primeClass) : null,
    msupBarClasses: msupBarClass ? normalizeClassList(msupBarClass) : null,
    integralClasses: integralClass ? normalizeClassList(integralClass) : null,
  }
}

const createMathmlClassMapMatcher = (classMap) => {
  const matchers = []
  if (classMap.primeClasses) matchers.push(PRIME_TRIGGER_RE)
  if (classMap.msupBarClasses) matchers.push(MSUP_BAR_TRIGGER_RE)
  if (classMap.integralClasses) matchers.push(INTEGRAL_TRIGGER_RE)
  if (matchers.length === 0) return null
  if (matchers.length === 1) {
    const [matcher] = matchers
    return (texContent) => Boolean(texContent) && matcher.test(texContent)
  }
  if (matchers.length === 2) {
    const [firstMatcher, secondMatcher] = matchers
    return (texContent) =>
      Boolean(texContent) && (firstMatcher.test(texContent) || secondMatcher.test(texContent))
  }
  return (texContent) =>
    Boolean(texContent)
      && (
        matchers[0].test(texContent)
        || matchers[1].test(texContent)
        || matchers[2].test(texContent)
      )
}

const findInlineMathEnd = (src, start, max) => {
  let pos = start + 1
  while (pos < max) {
    if (src.charCodeAt(pos) === DOLLAR_CHAR_CODE) {
      return pos
    }
    pos++
  }
  return -1
}

const createMathTexToMathML = ({ texPackages, resolveSvgFontModule } = {}) => {
  const packages = Array.isArray(texPackages) && texPackages.length ? texPackages : ['base']

  let mathmlContext = null
  const getMathmlContext = () => {
    if (mathmlContext) return mathmlContext
    const adaptor = liteAdaptor()
    const tex = new TeX({ packages })
    const html = new HTMLDocument('', adaptor, { InputJax: tex })
    const visitor = new SerializedMmlVisitor()
    mathmlContext = { html, visitor }
    return mathmlContext
  }

  let svgContext = null
  const getSvgContext = () => {
    if (svgContext) return svgContext
    const adaptor = liteAdaptor()
    RegisterHTMLHandler(adaptor)
    const tex = new TeX({ packages })
    svgContext = { adaptor, tex }
    return svgContext
  }

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

  const createSvgDocument = (options, svgFontData = null) => {
    const { adaptor, tex } = getSvgContext()
    const svgScale = Number.isFinite(options.svgScale) ? options.svgScale : 1
    const svgOptions = {
      fontCache: options.svgFontCache ?? 'local',
      scale: svgScale,
    }
    if (svgFontData) {
      svgOptions.fontData = svgFontData
    }
    const linebreaks = options.svgLinebreaks
    let hasLinebreaks = false
    if (linebreaks && typeof linebreaks === 'object' && !Array.isArray(linebreaks)) {
      for (const key in linebreaks) {
        if (Object.prototype.hasOwnProperty.call(linebreaks, key)) {
          hasLinebreaks = true
          break
        }
      }
    }
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
    if (md[MDIT_INSTALL_STATE]) return
    md[MDIT_INSTALL_STATE] = true

    const stripMathJaxData = options.setMathJaxDataAttrs !== true
    const useSvg = options.useSvg === true
    const em = Number.isFinite(options.em) ? options.em : 16
    const ex = Number.isFinite(options.ex) ? options.ex : 8
    const containerWidth = Number.isFinite(options.containerWidth) ? options.containerWidth : 680

    let convertInline
    let convertBlock
    if (useSvg) {
      const svgInlineOptions = { display: false, em, ex, containerWidth }
      const svgBlockOptions = { display: true, em, ex, containerWidth }
      const svgFontData = resolveSvgFontData(options.svgFont)
      let svgDocument = null
      const getSvgDocument = () => {
        if (svgDocument) return svgDocument
        svgDocument = createSvgDocument(options, svgFontData)
        return svgDocument
      }
      const convertSvg = (texContent, convertOptions) => {
        const { adaptor, html } = getSvgDocument()
        try {
          const node = html.convert(texContent || '', convertOptions)
          const svgCont = adaptor.outerHTML(node)
          return stripMathJaxDataAttrs(svgCont, stripMathJaxData)
        } finally {
          html.clear()
        }
      }
      convertInline = (texContent) => convertSvg(texContent, svgInlineOptions)
      convertBlock = (texContent) => convertSvg(texContent, svgBlockOptions)
    } else {
      const compactInline = options.compactInlineMathML === true
      const compactBlock = options.compactBlockMathML === true
      const mathmlInlineOptions = { display: false, end: STATE.CONVERT, em, ex, containerWidth }
      const mathmlBlockOptions = { display: true, end: STATE.CONVERT, em, ex, containerWidth }
      const mathmlClassMap = normalizeMathmlClassMap(options.mathmlLayoutClass ?? '')
      const mathmlClassMapMatcher = createMathmlClassMapMatcher(mathmlClassMap)
      const convertMathML = (texContent, convertOptions, shouldCompact) => {
        const { html, visitor } = getMathmlContext()
        try {
          const mmlNode = html.convert(texContent || '', convertOptions)
          if (mathmlClassMapMatcher && mathmlClassMapMatcher(texContent)) {
            applyMathmlClassMap(mmlNode, mathmlClassMap)
          }
          const mathML = visitor.visitTree(mmlNode)
          const stripped = stripMathJaxDataAttrs(mathML, stripMathJaxData)
          return shouldCompact ? compactMathML(stripped) : stripped
        } finally {
          html.clear()
        }
      }
      convertInline = (texContent) => convertMathML(texContent, mathmlInlineOptions, compactInline)
      convertBlock = (texContent) => convertMathML(texContent, mathmlBlockOptions, compactBlock)
    }

    md.block.ruler.after('blockquote', 'math_block', (state, startLine, endLine, silent) => {
      if (silent) return false
      let nextLine = startLine + 1
      const startPos = state.bMarks[startLine] + state.tShift[startLine]
      const endPos = state.eMarks[startLine]
      if (
        endPos - startPos < 2
        || state.src.charCodeAt(startPos) !== DOLLAR_CHAR_CODE
        || state.src.charCodeAt(startPos + 1) !== DOLLAR_CHAR_CODE
      ) {
        return false
      }
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
          const nextStartPos = state.bMarks[nextLine] + state.tShift[nextLine]
          const nextEndPos = state.eMarks[nextLine]
          if (
            nextEndPos - nextStartPos >= 2
            && state.src.charCodeAt(nextStartPos) === DOLLAR_CHAR_CODE
            && state.src.charCodeAt(nextStartPos + 1) === DOLLAR_CHAR_CODE
            && state.src.slice(nextStartPos, nextEndPos).trim() === '$$'
          ) {
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

    md.inline.ruler.before('text', 'math_inline', (state, silent) => {
      const start = state.pos
      const max = state.posMax
      if (state.src.charCodeAt(start) !== DOLLAR_CHAR_CODE || start + 2 > max) return false
      if (start > 0 && state.src.charCodeAt(start - 1) === DOLLAR_CHAR_CODE) return false
      if (state.src.charCodeAt(start + 1) === DOLLAR_CHAR_CODE) return false
      const end = findInlineMathEnd(state.src, start, max)
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
