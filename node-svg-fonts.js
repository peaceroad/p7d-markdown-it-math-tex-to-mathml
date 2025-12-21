// Supported font names: newcm, stix2, pagella, termes.
const SVG_FONTS = Object.freeze({
  newcm: {
    module: '@mathjax/mathjax-newcm-font/mjs/svg.js',
    exportName: 'MathJaxNewcmFont',
  },
  stix2: {
    module: '@mathjax/mathjax-stix2-font/mjs/svg.js',
    exportName: 'MathJaxStix2Font',
  },
  pagella: {
    module: '@mathjax/mathjax-pagella-font/mjs/svg.js',
    exportName: 'MathJaxPagellaFont',
  },
  termes: {
    module: '@mathjax/mathjax-termes-font/mjs/svg.js',
    exportName: 'MathJaxTermesFont',
  },
})

const normalizeSvgFontName = (value) => {
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

const resolveCache = new Map()

const resolveSvgFontName = (value) => {
  if (typeof value !== 'string') return null
  if (resolveCache.has(value)) return resolveCache.get(value)
  const normalized = normalizeSvgFontName(value)
  const resolved = normalized && normalized in SVG_FONTS ? normalized : null
  resolveCache.set(value, resolved)
  return resolved
}

export const svgFontNames = Object.freeze(Object.keys(SVG_FONTS))

const loadCache = new Map()

export const loadSvgFontData = async (fontName) => {
  const resolved = resolveSvgFontName(fontName)
  if (!resolved) {
    throw new Error(`Unknown SVG font name: ${fontName}`)
  }
  if (loadCache.has(resolved)) return loadCache.get(resolved)
  const { module: modulePath, exportName } = SVG_FONTS[resolved]
  const promise = import(modulePath).then((mod) => {
    const fontData = mod[exportName]
    if (!fontData) {
      throw new Error(`SVG font export '${exportName}' was not found in ${modulePath}`)
    }
    return fontData
  })
  loadCache.set(resolved, promise)
  return promise
}
