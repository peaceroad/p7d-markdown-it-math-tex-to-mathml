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
const MATHML_TAG_RE = /<\/?([a-z][a-z0-9-]*)(\s[^<>]*?)?>/gi
const MATHVARIANT_ATTR_RE = /\bmathvariant="([^"]+)"/i
const MATHSIZE_ATTR_RE = /\bmathsize="([^"]+)"/i
const DOLLAR_CHAR_CODE = 0x24
const BACKSLASH_CHAR_CODE = 0x5C
const PERIOD_CHAR_CODE = 0x2E
const COMMA_CHAR_CODE = 0x2C
const COLON_CHAR_CODE = 0x3A
const MDIT_INSTALL_STATE = Symbol('math-tex-to-mathml.installState')
const BASE_TEX_PACKAGE = 'base'
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
const MATHML_MODE_BROWSER = 'browser'
const MATHML_MODE_MATHJAX = 'mathjax'
const MATHML_REPORT_ENV_KEY = 'mathmlReport'
const SVG_FONT_CACHE_LOCAL = 'local'
const SVG_FONT_CACHE_NONE = 'none'
const LEGACY_MATHVARIANT_SHADOW_TYPES = new Set([
  'unsupported-mathvariant',
  'unconverted-mathvariant',
  'style-fallback-mathvariant',
])
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

// The Unicode ranges, variant starts, and style fallbacks below are adapted from
// MathJax's official "Convert Mathvariant to Unicode" filter example.
// Source:
//   https://docs.mathjax.org/en/v4.0/advanced/synchronize/filters.html#convert-mathvariant-to-unicode
// MathJax and its documentation are Apache-2.0 licensed; project docs record the
// provenance for this adapted local implementation.
const MATHML_CORE_VARIANT_RANGES = Object.freeze([
  Object.freeze([0x30, 0x39]),
  Object.freeze([0x41, 0x5A]),
  Object.freeze([0x61, 0x7A]),
  Object.freeze([0x391, 0x3A9, Object.freeze({ 0x3F4: 0x3A2, 0x2207: 0x3AA })]),
  Object.freeze([
    0x3B1,
    0x3C9,
    Object.freeze({
      0x2202: 0x3CA,
      0x3F5: 0x3CB,
      0x3D1: 0x3CC,
      0x3F0: 0x3CD,
      0x3D5: 0x3CE,
      0x3F1: 0x3CF,
      0x3D6: 0x3D0,
    }),
  ]),
])

const MATHML_CORE_VARIANTS = Object.freeze({
  bold: Object.freeze([0x1D7CE, 0x1D400, 0x1D41A, 0x1D6A8, 0x1D6C2]),
  italic: Object.freeze([0, 0x1D434, 0x1D44E, 0x1D6E2, 0x1D6FC, Object.freeze({ 0x68: 0x210E })]),
  'bold-italic': Object.freeze([0, 0x1D468, 0x1D482, 0x1D71C, 0x1D736]),
  script: Object.freeze([
    0,
    0x1D49C,
    0x1D4B6,
    0,
    0,
    Object.freeze({
      0x42: 0x212C,
      0x45: 0x2130,
      0x46: 0x2131,
      0x48: 0x210B,
      0x49: 0x2110,
      0x4C: 0x2112,
      0x4D: 0x2133,
      0x52: 0x211B,
      0x65: 0x212F,
      0x67: 0x210A,
      0x6F: 0x2134,
    }),
  ]),
  'bold-script': Object.freeze([0, 0x1D4D0, 0x1D4EA, 0, 0]),
  fraktur: Object.freeze([
    0,
    0x1D504,
    0x1D51E,
    0,
    0,
    Object.freeze({
      0x43: 0x212D,
      0x48: 0x210C,
      0x49: 0x2111,
      0x52: 0x211C,
      0x5A: 0x2128,
    }),
  ]),
  'bold-fraktur': Object.freeze([0, 0x1D56C, 0x1D586, 0, 0]),
  'double-struck': Object.freeze([
    0x1D7D8,
    0x1D538,
    0x1D552,
    0,
    0,
    Object.freeze({
      0x43: 0x2102,
      0x48: 0x210D,
      0x4E: 0x2115,
      0x50: 0x2119,
      0x51: 0x211A,
      0x52: 0x211D,
      0x5A: 0x2124,
      0x393: 0x213E,
      0x3A0: 0x213F,
      0x3B3: 0x213D,
      0x3C0: 0x213C,
    }),
  ]),
  'sans-serif': Object.freeze([0x1D7E2, 0x1D5A0, 0x1D5BA, 0, 0]),
  'bold-sans-serif': Object.freeze([0x1D7EC, 0x1D5D4, 0x1D5EE, 0x1D756, 0x1D770]),
  'sans-serif-italic': Object.freeze([0, 0x1D608, 0x1D622, 0, 0]),
  'sans-serif-bold-italic': Object.freeze([0, 0x1D63C, 0x1D656, 0x1D790, 0x1D7AA]),
  monospace: Object.freeze([0x1D7F6, 0x1D670, 0x1D68A, 0, 0]),
  '-tex-calligraphic': Object.freeze([
    0,
    0x1D49C,
    0x1D4B6,
    0,
    0,
    Object.freeze({
      0x42: 0x212C,
      0x45: 0x2130,
      0x46: 0x2131,
      0x48: 0x210B,
      0x49: 0x2110,
      0x4C: 0x2112,
      0x4D: 0x2133,
      0x52: 0x211B,
      0x65: 0x212F,
      0x67: 0x210A,
      0x6F: 0x2134,
    }),
    '\uFE00',
  ]),
  '-tex-bold-calligraphic': Object.freeze([0, 0x1D4D0, 0x1D4EA, 0, 0, Object.freeze({}), '\uFE00']),
  '-tex-mathit': Object.freeze([0, 0x1D434, 0x1D44E, 0x1D6E2, 0x1D6FC, Object.freeze({ 0x68: 0x210E })]),
})

const MATHML_CORE_VARIANT_STYLES = Object.freeze({
  bold: 'font-weight: bold',
  italic: 'font-style: italic',
  'bold-italic': 'font-weight: bold; font-style: italic',
  script: 'font-family: cursive',
  'bold-script': 'font-family: cursive; font-weight: bold',
  'sans-serif': 'font-family: sans-serif',
  'bold-sans-serif': 'font-family: sans-serif; font-weight: bold',
  'sans-serif-italic': 'font-family: sans-serif; font-style: italic',
  'sans-serif-bold-italic': 'font-family: sans-serif; font-weight: bold; font-style: italic',
  monospace: 'font-family: monospace',
  '-tex-mathit': 'font-style: italic',
})

const MATHML_CORE_ELEMENTS = new Set([
  'a',
  'annotation',
  'annotation-xml',
  'maction',
  'math',
  'merror',
  'mfrac',
  'mi',
  'mmultiscripts',
  'mn',
  'mo',
  'mover',
  'mpadded',
  'mphantom',
  'mprescripts',
  'mroot',
  'mrow',
  'ms',
  'mspace',
  'msqrt',
  'mstyle',
  'msub',
  'msubsup',
  'msup',
  'mtable',
  'mtd',
  'mtext',
  'mtr',
  'munder',
  'munderover',
  'semantics',
])

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

const normalizeMathmlMode = (value) => {
  if (value == null || value === '') return MATHML_MODE_BROWSER
  if (value === MATHML_MODE_BROWSER) return MATHML_MODE_BROWSER
  if (value === MATHML_MODE_MATHJAX) return MATHML_MODE_MATHJAX
  throw new Error(`Unsupported mathmlMode: ${value}`)
}

const normalizeSvgFontCache = (value) => {
  if (value == null || value === '') return SVG_FONT_CACHE_LOCAL
  if (value === SVG_FONT_CACHE_LOCAL || value === SVG_FONT_CACHE_NONE) return value
  if (value === 'global') {
    throw new Error(
      "Unsupported svgFontCache: global. This plugin serializes each SVG independently; use 'local' or 'none'."
    )
  }
  throw new Error(`Unsupported svgFontCache: ${value}`)
}

const normalizeTexPackageList = (value, fallback = [BASE_TEX_PACKAGE]) => {
  let entries = null
  if (Array.isArray(value)) {
    entries = value
  } else if (typeof value === 'string') {
    entries = value.split(',')
  }

  if (!entries) {
    return [...fallback]
  }

  const normalized = []
  const seen = new Set()

  const addPackage = (name) => {
    if (typeof name !== 'string') return
    const trimmed = name.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    normalized.push(trimmed)
  }

  addPackage(BASE_TEX_PACKAGE)
  for (const entry of entries) {
    addPackage(entry)
  }

  return normalized
}

const getTexPackageCacheKey = (packages) => packages.join('\u001F')

const isWhitespaceCharCode = (charCode) =>
  charCode === 0x20 || charCode === 0x09 || charCode === 0x0A || charCode === 0x0D

const isDigitCharCode = (charCode) => charCode >= 0x30 && charCode <= 0x39

const isEscapedCharacter = (src, pos) => {
  let count = 0
  for (let i = pos - 1; i >= 0 && src.charCodeAt(i) === BACKSLASH_CHAR_CODE; i--) {
    count++
  }
  return (count % 2) === 1
}

const canOpenInlineMathDelimiter = (src, pos, max) => {
  const prevChar = pos > 0 ? src.charCodeAt(pos - 1) : -1
  const nextChar = pos + 1 < max ? src.charCodeAt(pos + 1) : -1

  return (
    nextChar >= 0
    && nextChar !== DOLLAR_CHAR_CODE
    && !isWhitespaceCharCode(nextChar)
    && !isDigitCharCode(prevChar)
  )
}

const canCloseInlineMathDelimiter = (src, pos, max) => {
  const prevChar = pos > 0 ? src.charCodeAt(pos - 1) : -1
  const nextChar = pos + 1 < max ? src.charCodeAt(pos + 1) : -1

  return (
    prevChar >= 0
    && prevChar !== DOLLAR_CHAR_CODE
    && !isWhitespaceCharCode(prevChar)
    && !isDigitCharCode(nextChar)
  )
}

const isCurrencyLikeInlineDollarStart = (src, pos, max) => {
  const prevChar = pos > 0 ? src.charCodeAt(pos - 1) : -1
  if (prevChar >= 0 && !isWhitespaceCharCode(prevChar)) {
    return false
  }

  let cursor = pos + 1
  if (cursor >= max || !isDigitCharCode(src.charCodeAt(cursor))) {
    return false
  }

  cursor++
  while (cursor < max) {
    const charCode = src.charCodeAt(cursor)
    if (isDigitCharCode(charCode)) {
      cursor++
      continue
    }

    const nextChar = cursor + 1 < max ? src.charCodeAt(cursor + 1) : -1
    if ((charCode === PERIOD_CHAR_CODE || charCode === COMMA_CHAR_CODE) && isDigitCharCode(nextChar)) {
      cursor++
      continue
    }

    break
  }

  const boundaryChar = cursor < max ? src.charCodeAt(cursor) : -1
  return (
    boundaryChar < 0 ||
    isWhitespaceCharCode(boundaryChar) ||
    boundaryChar === PERIOD_CHAR_CODE ||
    boundaryChar === COMMA_CHAR_CODE ||
    boundaryChar === COLON_CHAR_CODE
  )
}

const resolveClassName = (value, defaultName) => {
  if (value === true) return defaultName
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const appendStyleAttribute = (node, styleText) => {
  if (!styleText) return
  const attributes = node?.attributes
  if (!attributes) return
  const current = attributes.get('style') || ''
  if (!current) {
    attributes.set('style', styleText)
    return
  }
  attributes.set('style', `${current.trim().replace(/;$/, '')}; ${styleText}`)
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

const getExplicitMathmlVariantName = (node) => {
  const attributes = node?.attributes
  if (!attributes || typeof attributes.getExplicit !== 'function') return null
  return (
    attributes.getExplicit('data-mjx-variant')
    || attributes.getExplicit('data-mjx-mathvariant')
    || attributes.getExplicit('mathvariant')
    || null
  )
}

const convertMathmlVariantText = (text, start, remap = {}, modifier = '') => {
  if (typeof text !== 'string') return null
  const converted = [...text]

  for (let i = 0; i < converted.length; i++) {
    const codePoint = converted[i].codePointAt(0)
    let mapped = null
    for (let j = 0; j < 5; j++) {
      if (!start[j]) continue
      const [rangeStart, rangeEnd, rangeMap = {}] = MATHML_CORE_VARIANT_RANGES[j]
      if (codePoint < rangeStart) break
      if (rangeMap[codePoint]) {
        mapped = String.fromCodePoint(rangeMap[codePoint] - rangeStart + start[j]) + modifier
        break
      }
      if (remap[codePoint] || codePoint <= rangeEnd) {
        mapped = String.fromCodePoint(remap[codePoint] || (codePoint - rangeStart + start[j])) + modifier
        break
      }
    }
    if (mapped == null) {
      return null
    }
    converted[i] = mapped
  }

  return converted.join('')
}

const clearMathmlVariantAttributes = (attributes) => {
  attributes.unset('mathvariant')
  attributes.unset('data-mjx-variant')
  attributes.unset('data-mjx-mathvariant')
}

const clearMathJaxVariantMetadata = (attributes) => {
  attributes.unset('data-mjx-variant')
  attributes.unset('data-mjx-mathvariant')
}

const hasSingleCodePoint = (text) =>
  typeof text === 'string'
  && text.length > 0
  && (text.length === 1 || (text.length === 2 && text.codePointAt(0) > 0xFFFF))

const shouldSkipMathmlCoreVariantStyleFallback = (variant, node, text) =>
  (variant === 'italic' || variant === '-tex-mathit') && hasSingleCodePoint(text) && node.isKind('mi')

const applyMathmlCoreVariantTransform = (root, issues = null) => {
  root.walkTree((node) => {
    if (!node.isToken) return
    const variant = getExplicitMathmlVariantName(node)
    if (!variant) return

    const text = node.getText()
    if (variant === 'normal') return

    if (!Object.prototype.hasOwnProperty.call(MATHML_CORE_VARIANTS, variant)) {
      if (issues) {
        issues.push({ type: 'unsupported-mathvariant', element: node.kind, value: variant })
      }
      return
    }

    const start = MATHML_CORE_VARIANTS[variant]
    const remap = start[5] || {}
    const modifier = start[6] || ''
    const textUpdates = []
    let converted = true

    for (const child of node.childNodes) {
      if (child.isKind('text')) {
        const convertedText = convertMathmlVariantText(child.getText(), start, remap, modifier)
        if (convertedText == null) {
          converted = false
          break
        }
        textUpdates.push([child, convertedText])
      }
    }

    const attributes = node.attributes

    if (converted) {
      clearMathmlVariantAttributes(attributes)
      for (const [child, convertedText] of textUpdates) {
        child.setText(convertedText)
      }
      return
    }

    if (shouldSkipMathmlCoreVariantStyleFallback(variant, node, text)) {
      clearMathmlVariantAttributes(attributes)
      return
    }

    const fallbackStyle = MATHML_CORE_VARIANT_STYLES[variant] || ''
    if (fallbackStyle) {
      clearMathJaxVariantMetadata(attributes)
      appendStyleAttribute(node, fallbackStyle)
      if (issues) {
        issues.push({ type: 'style-fallback-mathvariant', element: node.kind, value: variant })
      }
      return
    }

    if (issues) {
      issues.push({ type: 'unconverted-mathvariant', element: node.kind, value: variant })
    }
  })
}

const forEachDynamicFontFile = (font, callback) => {
  const CLASS = font?.CLASS
  if (!CLASS || typeof callback !== 'function') return
  const dynamicFiles = CLASS.dynamicFiles ?? {}
  for (const name of Object.keys(dynamicFiles)) {
    callback(dynamicFiles[name])
  }
  const dynamicExtensions = CLASS.dynamicExtensions
  if (!dynamicExtensions?.values) return
  for (const extension of dynamicExtensions.values()) {
    const files = extension?.files ?? {}
    for (const name of Object.keys(files)) {
      callback(files[name])
    }
  }
}

const replayLoadedDynamicSvgFontFiles = (svg) => {
  const font = svg?.font
  if (!font) return

  forEachDynamicFontFile(font, (dynamic) => {
    if (dynamic?.promise && !dynamic.failed && typeof dynamic.setup === 'function') {
      dynamic.setup(font)
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

const collectMathmlCoreIssues = (markup) => {
  if (typeof markup !== 'string' || !markup) return []

  const issues = []
  const seen = new Set()
  const shouldTrackMathsize = markup.includes('mathsize=')
  const mathmlElementStack = []
  const mathsizeValueStack = []

  const pushIssue = (issue) => {
    const key = JSON.stringify(issue)
    if (seen.has(key)) return
    seen.add(key)
    issues.push(issue)
  }

  let match = null
  while ((match = MATHML_TAG_RE.exec(markup))) {
    const rawTag = match[0]
    const isClosing = rawTag.startsWith('</')
    const tag = match[1].toLowerCase()
    const attrs = match[2] || ''

    if (isClosing) {
      if (!shouldTrackMathsize) continue
      while (mathmlElementStack.length > 0) {
        const entry = mathmlElementStack.pop()
        if (entry.mathsizeValue) mathsizeValueStack.pop()
        if (entry.tag === tag) break
      }
      continue
    }

    if (!MATHML_CORE_ELEMENTS.has(tag)) {
      pushIssue({ type: 'non-core-element', element: tag })
    }

    if (tag === 'merror') {
      pushIssue({ type: 'math-error', element: tag })
    }

    const mathvariantMatch = attrs.includes('mathvariant=') ? attrs.match(MATHVARIANT_ATTR_RE) : null
    if (mathvariantMatch) {
      const value = mathvariantMatch[1]
      if (value.toLowerCase() !== 'normal') {
        pushIssue({ type: 'legacy-mathvariant', element: tag, value })
      }
    }

    let mathsizeValue = null
    if (shouldTrackMathsize && attrs.includes('mathsize=')) {
      const mathsizeMatch = attrs.match(MATHSIZE_ATTR_RE)
      mathsizeValue = mathsizeMatch ? mathsizeMatch[1] : null
    }
    if (mathsizeValue) {
      const ancestorValue = mathsizeValueStack[mathsizeValueStack.length - 1]
      if (ancestorValue) {
        pushIssue({
          type: 'nested-mathsize',
          element: tag,
          value: mathsizeValue,
          ancestorValue,
        })
      }
    }

    if (shouldTrackMathsize && !rawTag.endsWith('/>')) {
      mathmlElementStack.push({ tag, mathsizeValue })
      if (mathsizeValue) mathsizeValueStack.push(mathsizeValue)
    }
  }

  return issues
}

const mergeMathmlCoreIssues = (...issueLists) => {
  const issues = []
  const seen = new Set()

  for (const issueList of issueLists) {
    if (!Array.isArray(issueList)) continue
    for (const issue of issueList) {
      if (!issue) continue
      const key = JSON.stringify(issue)
      if (seen.has(key)) continue
      seen.add(key)
      issues.push(issue)
    }
  }

  return issues
}

const suppressRedundantMathmlCoreLegacyIssues = (issues, transformIssues) => {
  if (!Array.isArray(issues) || issues.length === 0 || !Array.isArray(transformIssues) || transformIssues.length === 0) {
    return issues
  }

  const shadowedLegacyKeys = new Set()
  for (const issue of transformIssues) {
    if (!issue || !LEGACY_MATHVARIANT_SHADOW_TYPES.has(issue.type)) continue
    shadowedLegacyKeys.add(`${issue.element}\u001F${issue.value}`)
  }

  if (shadowedLegacyKeys.size === 0) return issues

  return issues.filter((issue) => {
    if (!issue || issue.type !== 'legacy-mathvariant') return true
    return !shadowedLegacyKeys.has(`${issue.element}\u001F${issue.value}`)
  })
}

const appendMathmlCoreReport = (env, entry) => {
  if (!env || typeof env !== 'object' || !entry) return
  const report = env[MATHML_REPORT_ENV_KEY]
  if (!Array.isArray(report)) return
  report.push(entry)
}

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
  const abortOnInvalidClose = isDigitCharCode(src.charCodeAt(start + 1))

  for (let pos = src.indexOf('$', start + 1); pos !== -1 && pos < max; pos = src.indexOf('$', pos + 1)) {
    if (isEscapedCharacter(src, pos)) continue
    if (canCloseInlineMathDelimiter(src, pos, max)) {
      return pos
    }
    if (abortOnInvalidClose) {
      return -1
    }
  }
  return -1
}

const createMathTexToMathML = ({
  texPackages,
  defaultSvgFont = '',
  resolveSvgFontModule,
  prepareSynchronousSvg,
} = {}) => {
  const defaultPackages = normalizeTexPackageList(texPackages)

  const mathmlContextCache = new Map()
  const getMathmlContext = (packages) => {
    const cacheKey = getTexPackageCacheKey(packages)
    const cached = mathmlContextCache.get(cacheKey)
    if (cached) return cached
    const adaptor = liteAdaptor()
    const tex = new TeX({ packages })
    const html = new HTMLDocument('', adaptor, { InputJax: tex })
    const visitor = new SerializedMmlVisitor()
    const context = { html, visitor }
    mathmlContextCache.set(cacheKey, context)
    return context
  }

  const svgContextCache = new Map()
  const getSvgContext = (packages) => {
    const cacheKey = getTexPackageCacheKey(packages)
    const cached = svgContextCache.get(cacheKey)
    if (cached) return cached
    const adaptor = liteAdaptor()
    RegisterHTMLHandler(adaptor)
    const tex = new TeX({ packages })
    const context = { adaptor, tex }
    svgContextCache.set(cacheKey, context)
    return context
  }

  const resolveSvgFontData = (value) => {
    if (!value) return null

    let fontDefinition = null
    if (typeof value === 'string') {
      const resolved = resolveSvgFontName(value)
      if (!resolved) {
        throw new Error(`Unknown SVG font name: ${value}`)
      }
      if (!resolveSvgFontModule) {
        throw new Error('svgFont name resolution is only available in Node.js. Import the font class and pass it via svgFont in browser/bundler environments.')
      }
      fontDefinition = SVG_FONTS[resolved]
    } else if (resolveSvgFontModule) {
      const className = typeof value === 'function' ? value.name : value?.constructor?.name
      fontDefinition = Object.values(SVG_FONTS).find(({ exportName }) => exportName === className) ?? null
    }

    if (!fontDefinition) return value

    const { module: modulePath, exportName } = fontDefinition
    const mod = resolveSvgFontModule(modulePath)
    const fontData = mod?.[exportName]
    if (!fontData) {
      throw new Error(`SVG font export '${exportName}' was not found in ${modulePath}`)
    }
    return fontData
  }

  const createSvgDocument = (svgOptions, packages, svgFontData = null) => {
    const { adaptor, tex } = getSvgContext(packages)
    const outputOptions = { ...svgOptions }
    if (svgFontData) {
      outputOptions.fontData = svgFontData
    }
    const svg = new SVG(outputOptions)
    if (prepareSynchronousSvg) {
      prepareSynchronousSvg(svg)
      replayLoadedDynamicSvgFontFiles(svg)
    }
    const html = mathjax.document('', { InputJax: tex, OutputJax: svg })
    return { adaptor, html }
  }

  const normalizeSvgOptions = (options) => {
    const svgScale = Number.isFinite(options.svgScale) ? options.svgScale : 1
    const svgOptions = {
      fontCache: normalizeSvgFontCache(options.svgFontCache),
      scale: svgScale,
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
      svgOptions.linebreaks = { ...linebreaks }
    }
    if (options.svgFontPath) {
      svgOptions.fontPath = options.svgFontPath
    }
    return svgOptions
  }

  const mditMathTexToMathML = (md, options = {}) => {
    if (md[MDIT_INSTALL_STATE]) return
    if (!options || typeof options !== 'object') {
      options = {}
    }

    const stripMathJaxData = options.setMathJaxDataAttrs !== true
    const useSvg = options.useSvg === true
    const mathmlMode = normalizeMathmlMode(options.mathmlMode)
    const mathmlReport = options.mathmlReport === true
    const resolvedPackages = normalizeTexPackageList(options.texPackages, defaultPackages)
    const em = Number.isFinite(options.em) ? options.em : 16
    const ex = Number.isFinite(options.ex) ? options.ex : 8
    const containerWidth = Number.isFinite(options.containerWidth) ? options.containerWidth : 680
    const svgFontData = useSvg ? resolveSvgFontData(options.svgFont || defaultSvgFont) : null
    const normalizedSvgOptions = useSvg ? normalizeSvgOptions(options) : null

    if (mathmlReport) {
      md.core.ruler.before('block', 'mathml_report_reset', (state) => {
        if (!state.env || typeof state.env !== 'object') {
          state.env = {}
        }
        state.env[MATHML_REPORT_ENV_KEY] = []
      })
    }

    let convertInline
    let convertBlock
    if (useSvg) {
      const svgInlineOptions = { display: false, em, ex, containerWidth }
      const svgBlockOptions = { display: true, em, ex, containerWidth }
      let svgDocument = null
      const getSvgDocument = () => {
        if (svgDocument) return svgDocument
        svgDocument = createSvgDocument(normalizedSvgOptions, resolvedPackages, svgFontData)
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
      let mathmlContext = null
      const getPluginMathmlContext = () => {
        if (mathmlContext) return mathmlContext
        mathmlContext = getMathmlContext(resolvedPackages)
        return mathmlContext
      }
      const convertMathML = (texContent, convertOptions, shouldCompact, env) => {
        const { html, visitor } = getPluginMathmlContext()
        try {
          const mmlNode = html.convert(texContent || '', convertOptions)
          const transformIssues = mathmlReport && mathmlMode === MATHML_MODE_BROWSER ? [] : null
          if (mathmlMode === MATHML_MODE_BROWSER) {
            applyMathmlCoreVariantTransform(mmlNode, transformIssues)
          }
          if (mathmlClassMapMatcher && mathmlClassMapMatcher(texContent)) {
            applyMathmlClassMap(mmlNode, mathmlClassMap)
          }
          const mathML = visitor.visitTree(mmlNode)
          if (mathmlReport) {
            const markupIssues = suppressRedundantMathmlCoreLegacyIssues(
              collectMathmlCoreIssues(mathML),
              transformIssues
            )
            const issues = mergeMathmlCoreIssues(transformIssues, markupIssues)
            if (issues.length > 0) {
              appendMathmlCoreReport(env, {
                tex: texContent || '',
                display: convertOptions.display === true,
                issues,
              })
            }
          }
          const stripped = stripMathJaxDataAttrs(mathML, stripMathJaxData)
          return shouldCompact ? compactMathML(stripped) : stripped
        } finally {
          html.clear()
        }
      }
      convertInline = (texContent, env) => convertMathML(texContent, mathmlInlineOptions, compactInline, env)
      convertBlock = (texContent, env) => convertMathML(texContent, mathmlBlockOptions, compactBlock, env)
    }

    const pushMathBlockToken = (state, content, start, end) => {
      const markup = convertBlock(content, state.env) + '\n'
      state.line = end
      const token = state.push('html_block', '', 0)
      token.content = markup
      token.map = [start, end]
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
        pushMathBlockToken(state, content, startLine, nextLine + 1)
        return true
      }

      if (isOneLineMathBlock) {
        const content = firstLine.slice(2, -2).trim()
        pushMathBlockToken(state, content, startLine, startLine + 1)
        return true
      }
    })

    md.inline.ruler.before('text', 'math_inline', (state, silent) => {
      const start = state.pos
      const max = state.posMax
      if (state.src.charCodeAt(start) !== DOLLAR_CHAR_CODE || start + 2 >= max) return false
      if (start > 0 && state.src.charCodeAt(start - 1) === DOLLAR_CHAR_CODE) return false
      if (state.src.charCodeAt(start + 1) === DOLLAR_CHAR_CODE) return false
      if (isEscapedCharacter(state.src, start)) return false
      if (isCurrencyLikeInlineDollarStart(state.src, start, max)) return false
      if (!canOpenInlineMathDelimiter(state.src, start, max)) return false
      const end = findInlineMathEnd(state.src, start, max)
      if (end === -1) return false

      if (!silent) {
        const content = state.src.slice(start + 1, end)
        const token = state.push('math_inline', 'math', 0)
        token.content = convertInline(content, state.env)
        token.markup = '$'
      }
      state.pos = end + 1
      return true
    })

    md.renderer.rules.math_inline = (tokens, idx) => tokens[idx].content
    md[MDIT_INSTALL_STATE] = true
  }

  return mditMathTexToMathML
}

export default createMathTexToMathML
