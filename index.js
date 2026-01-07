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
const PRIME_MO_CONTENT = new Set([
  '\u2032', // U+2032 PRIME
  '\u2033', // U+2033 DOUBLE PRIME
  '\u2034', // U+2034 TRIPLE PRIME
  '\u2057', // U+2057 QUADRUPLE PRIME
  '&#x2032;', // HTML hex entity: U+2032 PRIME
  '&#x2033;', // HTML hex entity: U+2033 DOUBLE PRIME
  '&#x2034;', // HTML hex entity: U+2034 TRIPLE PRIME
  '&#x2057;', // HTML hex entity: U+2057 QUADRUPLE PRIME
  '&#8242;', // HTML decimal entity: U+2032 PRIME
  '&#8243;', // HTML decimal entity: U+2033 DOUBLE PRIME
  '&#8244;', // HTML decimal entity: U+2034 TRIPLE PRIME
  '&#8279;', // HTML decimal entity: U+2057 QUADRUPLE PRIME
  '&prime;', // HTML named entity: U+2032 PRIME
  '&Prime;', // HTML named entity: U+2033 DOUBLE PRIME
  '&tprime;', // HTML named entity: U+2034 TRIPLE PRIME
  '&qprime;', // HTML named entity: U+2057 QUADRUPLE PRIME
])
const PRIME_MO_RE = /<mo([^>]*)>([^<]+)<\/mo>/g
const PRIME_MO_MARKER_RE = /(?:\u2032|\u2033|\u2034|\u2057|&prime;|&Prime;|&tprime;|&qprime;|&#x2032;|&#x2033;|&#x2034;|&#x2057;|&#8242;|&#8243;|&#8244;|&#8279;)/
const MSUP_BAR_MO_CONTENT = new Set(['|', '&#x7C;', '&#124;', '&vert;'])
const MSUP_BAR_MARKERS = ['|', '&#x7C;', '&#124;', '&vert;']
const MSUBSUP_INTEGRAL_MO_CONTENT = new Set([
  '\u222B', // U+222B INTEGRAL
  '&#x222B;', // HTML hex entity: U+222B INTEGRAL
  '&#8747;', // HTML decimal entity: U+222B INTEGRAL
  '&int;', // HTML named entity: U+222B INTEGRAL
])
const MSUBSUP_INTEGRAL_MARKERS = ['\u222B', '&#x222B;', '&#8747;', '&int;']
const MSUP_BAR_RE = /<msup([^>]*)>([\s\S]*?)<\/msup>/g
const MSUP_BAR_INNER_RE = /^\s*<mo([^>]*)>([^<]+)<\/mo>\s*<mn([^>]*)>([^<]+)<\/mn>\s*$/
const MSUBSUP_RE = /<msubsup([^>]*)>([\s\S]*?)<\/msubsup>/g
const MSUBSUP_INTEGRAL_MO_RE = /^\s*<mo[^>]*>([^<]+)<\/mo>/
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

const texExtensionNames = Object.keys(source)
  .filter((name) => name.startsWith('[tex]/'))
  .map((name) => name.substring(6))
  .filter((name) => name !== 'bussproofs')

const texPackages = ['base', ...texExtensionNames]

const texPackageImports = texExtensionNames.map(
  (name) => `@mathjax/src/components/mjs/input/tex/extensions/${name}/${name}.js`
)

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

const normalizeClassList = (value) => value.split(/\s+/).filter(Boolean)
const hasAnyMarker = (markup, markers) => markers.some((marker) => markup.includes(marker))

const resolveClassName = (value, defaultName) => {
  if (value === true) return defaultName
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const resolveMathmlClassMap = (value) => {
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
    return {
      primeClass: resolveClassName(value, DEFAULT_PRIME_CLASS),
      msupBarClass: null,
      integralClass: null,
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

const appendClassAttribute = (attrs, className) => {
  const additions = normalizeClassList(className)
  if (additions.length === 0) return attrs
  const classMatch = attrs.match(/\sclass=(["'])([^"']*)\1/)
  if (!classMatch) {
    return `${attrs} class="${additions.join(' ')}"`
  }
  const existing = normalizeClassList(classMatch[2])
  for (const cls of additions) {
    if (!existing.includes(cls)) {
      existing.push(cls)
    }
  }
  const updated = ` class=${classMatch[1]}${existing.join(' ')}${classMatch[1]}`
  return attrs.replace(classMatch[0], updated)
}

const markPrimeOperators = (markup, className) => {
  if (!className) return markup
  if (!markup.includes('<mo')) return markup
  if (!PRIME_MO_MARKER_RE.test(markup)) return markup
  return markup.replace(PRIME_MO_RE, (match, attrs, content) => {
    const trimmed = content.trim()
    if (!PRIME_MO_CONTENT.has(trimmed)) {
      return match
    }
    const updatedAttrs = appendClassAttribute(attrs, className)
    return `<mo${updatedAttrs}>${content}</mo>`
  })
}

const markBarSuperscripts = (markup, className) => {
  if (!className) return markup
  if (!markup.includes('<msup')) return markup
  if (!hasAnyMarker(markup, MSUP_BAR_MARKERS)) return markup
  return markup.replace(MSUP_BAR_RE, (match, attrs, inner) => {
    const innerMatch = inner.match(MSUP_BAR_INNER_RE)
    if (!innerMatch) return match
    const moContent = innerMatch[2]
    if (!MSUP_BAR_MO_CONTENT.has(moContent.trim())) {
      return match
    }
    const updatedAttrs = appendClassAttribute(attrs, className)
    return `<msup${updatedAttrs}>${inner}</msup>`
  })
}

const markIntegralSubsup = (markup, className) => {
  if (!className) return markup
  if (!markup.includes('<msubsup')) return markup
  if (!hasAnyMarker(markup, MSUBSUP_INTEGRAL_MARKERS)) return markup
  return markup.replace(MSUBSUP_RE, (match, attrs, inner) => {
    const moMatch = inner.match(MSUBSUP_INTEGRAL_MO_RE)
    if (!moMatch) return match
    const trimmed = moMatch[1].trim()
    if (!MSUBSUP_INTEGRAL_MO_CONTENT.has(trimmed)) {
      return match
    }
    const updatedAttrs = appendClassAttribute(attrs, className)
    return `<msubsup${updatedAttrs}>${inner}</msubsup>`
  })
}

const resolveSvgFontName = (value) => {
  const normalized = normalizeSvgFontName(value)
  if (!normalized) return null
  return normalized in SVG_FONTS ? normalized : null
}

let nodeRequire = null
let nodeCreateRequire = null
let mathjaxRequire = undefined
if (typeof process !== 'undefined' && process?.versions?.node) {
  try {
    const moduleSpecifier = 'node:module'
    const { createRequire } = await import(moduleSpecifier)
    nodeCreateRequire = createRequire
    nodeRequire = createRequire(import.meta.url)
  } catch {
    nodeRequire = null
    nodeCreateRequire = null
  }
}

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

const resolveSvgFontData = (value) => {
  if (!value) return null
  if (typeof value !== 'string') return value
  const resolved = resolveSvgFontName(value)
  if (!resolved) {
    throw new Error(`Unknown SVG font name: ${value}`)
  }
  if (!nodeRequire) {
    throw new Error('svgFont name resolution is only available in Node.js. Import the font class and pass it via svgFont in browser/bundler environments.')
  }
  const resolveMathjaxRequire = () => {
    if (mathjaxRequire !== undefined) return mathjaxRequire
    if (!nodeRequire || !nodeCreateRequire) {
      mathjaxRequire = null
      return null
    }
    try {
      const mathjaxPkg = nodeRequire.resolve('@mathjax/src/package.json')
      mathjaxRequire = nodeCreateRequire(mathjaxPkg)
    } catch {
      mathjaxRequire = null
    }
    return mathjaxRequire
  }
  const isModuleNotFound = (error, modulePath) => {
    if (!error) return false
    const code = error?.code
    if (code !== 'MODULE_NOT_FOUND' && code !== 'ERR_MODULE_NOT_FOUND') return false
    const message = error?.message ?? ''
    return message.includes(modulePath) || message.includes('Cannot find module') || message.includes('Cannot find package')
  }
  const resolveSvgFontModule = (modulePath) => {
    try {
      return nodeRequire(modulePath)
    } catch (error) {
      if (!isModuleNotFound(error, modulePath)) {
        throw error
      }
      const fallback = resolveMathjaxRequire()
      if (!fallback) {
        throw error
      }
      return fallback(modulePath)
    }
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
    fontCache: options.fontCache || 'local',
    scale: svgScale,
  }
  if (svgFontData) {
    svgOptions.fontData = svgFontData
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
  const removeAttrs = options.removeMathJaxData === true
  const compact = options.compactMathML === true
  const useSvg = options.useSvg === true
  const { primeClass, msupBarClass, integralClass } = resolveMathmlClassMap(options.mathmlClassMap)
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
      let output = stripped
      if (primeClass) {
        output = markPrimeOperators(output, primeClass)
      }
      if (msupBarClass) {
        output = markBarSuperscripts(output, msupBarClass)
      }
      if (integralClass) {
        output = markIntegralSubsup(output, integralClass)
      }
      return compact ? compactMathML(output) : output
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
