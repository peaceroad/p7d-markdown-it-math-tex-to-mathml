import { createRequire } from 'node:module'
import path from 'node:path'
import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { source } from '@mathjax/src/components/mjs/source.js'
import createMathTexToMathML from './script/math-tex-to-mathml-core.js'

const PRELOAD_EXCLUDED_TEX_PACKAGES = new Set(['bussproofs', 'bboldx'])
const DEFAULT_INACTIVE_TEX_PACKAGES = new Set(['fontsizev3'])

const texExtensionNames = Object.keys(source)
  .filter((name) => name.startsWith('[tex]/'))
  .map((name) => name.substring(6))
  .filter((name) => !PRELOAD_EXCLUDED_TEX_PACKAGES.has(name))

const texPackages = ['base', ...texExtensionNames.filter((name) => !DEFAULT_INACTIVE_TEX_PACKAGES.has(name))]

const texPackageImports = texExtensionNames.map(
  (name) => `@mathjax/src/components/mjs/input/tex/extensions/${name}/${name}.js`
)

const nodeRequire = createRequire(import.meta.url)
let mathjaxRequire = undefined
let mathjaxCjs = undefined
let mathjaxCjsRoot = undefined
let syncSvgMathJaxPrepared = false
// Load MathJax v4 TeX extensions so synchronous conversion works the same way
// it did with the bundled v3 list.
await Promise.all(texPackageImports.map((specifier) => import(specifier)))

const resolveMathjaxRequire = () => {
  if (mathjaxRequire !== undefined) return mathjaxRequire
  try {
    const mathjaxPkg = nodeRequire.resolve('@mathjax/src/package.json')
    mathjaxRequire = createRequire(mathjaxPkg)
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
  return (
    !modulePath
    || message.includes(modulePath)
    || message.includes('Cannot find module')
    || message.includes('Cannot find package')
  )
}

const resolveFromNodeOrMathJax = (modulePath) => {
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

const resolveMathjaxCjsRoot = () => {
  if (mathjaxCjsRoot !== undefined) return mathjaxCjsRoot
  try {
    const mathjaxCjsPath = nodeRequire.resolve('@mathjax/src/cjs/mathjax.js')
    mathjaxCjsRoot = path.dirname(mathjaxCjsPath)
  } catch (error) {
    if (!isModuleNotFound(error, '@mathjax/src/cjs/mathjax.js')) {
      throw error
    }
    mathjaxCjsRoot = null
  }
  return mathjaxCjsRoot
}

const createSynchronousSvgLoader = (existingLoaders = []) => (modulePath) => {
  for (const load of existingLoaders) {
    try {
      return load(modulePath)
    } catch (error) {
      if (!isModuleNotFound(error, modulePath)) {
        throw error
      }
    }
  }

  if (typeof modulePath === 'string' && modulePath.startsWith('.')) {
    const root = resolveMathjaxCjsRoot()
    if (!root) {
      throw new Error(`MathJax CJS root could not be resolved for ${modulePath}`)
    }
    return nodeRequire(path.resolve(root, modulePath))
  }

  return resolveFromNodeOrMathJax(modulePath)
}

const collectSynchronousMathJaxLoader = (owner, load, isSynchronous) => {
  if (typeof load !== 'function') return null
  if (isSynchronous === true) return load
  throw new Error(
    `Synchronous SVG output requires a synchronous MathJax asyncLoad bridge, `
      + `but MathJax ${owner} already has a non-synchronous asyncLoad configured. `
      + `Use a dedicated process or configure a synchronous loader before enabling useSvg.`
  )
}

const setupSynchronousSvgMathJax = () => {
  if (syncSvgMathJaxPrepared) return

  if (mathjaxCjs === undefined) {
    try {
      mathjaxCjs = resolveFromNodeOrMathJax('@mathjax/src/cjs/mathjax.js')?.mathjax ?? null
    } catch (error) {
      if (!isModuleNotFound(error, '@mathjax/src/cjs/mathjax.js')) {
        throw error
      }
      mathjaxCjs = null
    }
  }

  const existingLoaders = []
  const mjsLoader = collectSynchronousMathJaxLoader(
    'MJS',
    mathjax.asyncLoad,
    mathjax.asyncIsSynchronous === true
  )
  if (mjsLoader) {
    existingLoaders.push(mjsLoader)
  }
  if (mathjaxCjs) {
    const cjsLoader = collectSynchronousMathJaxLoader(
      'CJS',
      mathjaxCjs.asyncLoad,
      mathjaxCjs.asyncIsSynchronous === true
    )
    if (cjsLoader && cjsLoader !== mjsLoader) {
      existingLoaders.push(cjsLoader)
    }
  }

  const syncSvgLoadModule = createSynchronousSvgLoader(existingLoaders)
  mathjax.asyncLoad = syncSvgLoadModule
  mathjax.asyncIsSynchronous = true

  if (mathjaxCjs) {
    mathjaxCjs.asyncLoad = syncSvgLoadModule
    mathjaxCjs.asyncIsSynchronous = true
  }

  syncSvgMathJaxPrepared = true
}

const resolveSvgFontModule = (modulePath) => resolveFromNodeOrMathJax(modulePath)

const mditMathTexToMathML = createMathTexToMathML({
  texPackages,
  defaultSvgFont: 'newcm',
  resolveSvgFontModule,
  prepareSynchronousSvg: setupSynchronousSvgMathJax,
})

export default mditMathTexToMathML
