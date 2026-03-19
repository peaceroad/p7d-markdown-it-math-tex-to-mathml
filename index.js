import path from 'node:path'
import { mathjax } from '@mathjax/src/mjs/mathjax.js'
import { source } from '@mathjax/src/components/mjs/source.js'
import createMathTexToMathML from './script/math-tex-to-mathml-core.js'

const texExtensionNames = Object.keys(source)
  .filter((name) => name.startsWith('[tex]/'))
  .map((name) => name.substring(6))
  .filter((name) => name !== 'bussproofs' && name !== 'bboldx')

const texPackages = ['base', ...texExtensionNames]

const texPackageImports = texExtensionNames.map(
  (name) => `@mathjax/src/components/mjs/input/tex/extensions/${name}/${name}.js`
)

let nodeRequire = null
let nodeCreateRequire = null
let mathjaxRequire = undefined
let mathjaxCjs = undefined
let mathjaxCjsRoot = undefined
let syncSvgMathJaxPrepared = false
let syncSvgLoadModule = null
if (typeof process !== 'undefined' && process?.versions?.node) {
  try {
    const { createRequire } = await import('node:module')
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
  return (
    !modulePath
    || message.includes(modulePath)
    || message.includes('Cannot find module')
    || message.includes('Cannot find package')
  )
}

const resolveFromNodeOrMathJax = nodeRequire
  ? (modulePath) => {
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
  : null

const resolveMathjaxCjsRoot = () => {
  if (mathjaxCjsRoot !== undefined) return mathjaxCjsRoot
  if (!nodeRequire) {
    mathjaxCjsRoot = null
    return null
  }
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

const setupSynchronousSvgMathJax = resolveFromNodeOrMathJax
  ? () => {
    if (syncSvgMathJaxPrepared) return

    if (!syncSvgLoadModule) {
      syncSvgLoadModule = (modulePath) => {
        if (typeof modulePath === 'string' && modulePath.startsWith('.')) {
          const root = resolveMathjaxCjsRoot()
          if (!root) {
            throw new Error(`MathJax CJS root could not be resolved for ${modulePath}`)
          }
          return nodeRequire(path.resolve(root, modulePath))
        }
        return resolveFromNodeOrMathJax(modulePath)
      }
    }

    mathjax.asyncLoad = syncSvgLoadModule
    mathjax.asyncIsSynchronous = true

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
    if (mathjaxCjs) {
      mathjaxCjs.asyncLoad = syncSvgLoadModule
      mathjaxCjs.asyncIsSynchronous = true
    }

    syncSvgMathJaxPrepared = true
  }
  : null

const resolveSvgFontModule = nodeRequire
  ? (modulePath) => resolveFromNodeOrMathJax(modulePath)
  : null

const mditMathTexToMathML = createMathTexToMathML({
  texPackages,
  defaultSvgFont: 'newcm',
  resolveSvgFontModule,
  prepareSynchronousSvg: setupSynchronousSvgMathJax,
})

export default mditMathTexToMathML
