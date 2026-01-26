import { source } from '@mathjax/src/components/mjs/source.js'
import createMathTexToMathML from './script/math-tex-to-mathml-core.js'

const texExtensionNames = Object.keys(source)
  .filter((name) => name.startsWith('[tex]/'))
  .map((name) => name.substring(6))
  .filter((name) => name !== 'bussproofs')

const texPackages = ['base', ...texExtensionNames]

const texPackageImports = texExtensionNames.map(
  (name) => `@mathjax/src/components/mjs/input/tex/extensions/${name}/${name}.js`
)

let nodeRequire = null
let nodeCreateRequire = null
let mathjaxRequire = undefined
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

const resolveSvgFontModule = nodeRequire
  ? (modulePath) => {
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

const mditMathTexToMathML = createMathTexToMathML({ texPackages, resolveSvgFontModule })

export default mditMathTexToMathML
