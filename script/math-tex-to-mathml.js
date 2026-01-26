// Browser entry (bundler usage recommended).
// Install `@mathjax/src` and let your bundler resolve it from node_modules.
// If you serve ESM directly, map `@mathjax/src` to your hosted MathJax v4 sources.
// For SVG fonts in browsers, import the font class and pass it via `svgFont`.
import '@mathjax/src/components/mjs/input/tex/extensions/action/action.js'
import '@mathjax/src/components/mjs/input/tex/extensions/ams/ams.js'
import '@mathjax/src/components/mjs/input/tex/extensions/amscd/amscd.js'
import '@mathjax/src/components/mjs/input/tex/extensions/autoload/autoload.js'
import '@mathjax/src/components/mjs/input/tex/extensions/bbm/bbm.js'
import '@mathjax/src/components/mjs/input/tex/extensions/bboldx/bboldx.js'
import '@mathjax/src/components/mjs/input/tex/extensions/bbox/bbox.js'
import '@mathjax/src/components/mjs/input/tex/extensions/begingroup/begingroup.js'
import '@mathjax/src/components/mjs/input/tex/extensions/boldsymbol/boldsymbol.js'
import '@mathjax/src/components/mjs/input/tex/extensions/braket/braket.js'
import '@mathjax/src/components/mjs/input/tex/extensions/cancel/cancel.js'
import '@mathjax/src/components/mjs/input/tex/extensions/cases/cases.js'
import '@mathjax/src/components/mjs/input/tex/extensions/centernot/centernot.js'
import '@mathjax/src/components/mjs/input/tex/extensions/color/color.js'
import '@mathjax/src/components/mjs/input/tex/extensions/colortbl/colortbl.js'
import '@mathjax/src/components/mjs/input/tex/extensions/colorv2/colorv2.js'
import '@mathjax/src/components/mjs/input/tex/extensions/configmacros/configmacros.js'
import '@mathjax/src/components/mjs/input/tex/extensions/dsfont/dsfont.js'
import '@mathjax/src/components/mjs/input/tex/extensions/empheq/empheq.js'
import '@mathjax/src/components/mjs/input/tex/extensions/enclose/enclose.js'
import '@mathjax/src/components/mjs/input/tex/extensions/extpfeil/extpfeil.js'
import '@mathjax/src/components/mjs/input/tex/extensions/gensymb/gensymb.js'
import '@mathjax/src/components/mjs/input/tex/extensions/html/html.js'
import '@mathjax/src/components/mjs/input/tex/extensions/mathtools/mathtools.js'
import '@mathjax/src/components/mjs/input/tex/extensions/mhchem/mhchem.js'
import '@mathjax/src/components/mjs/input/tex/extensions/newcommand/newcommand.js'
import '@mathjax/src/components/mjs/input/tex/extensions/noerrors/noerrors.js'
import '@mathjax/src/components/mjs/input/tex/extensions/noundefined/noundefined.js'
import '@mathjax/src/components/mjs/input/tex/extensions/physics/physics.js'
import '@mathjax/src/components/mjs/input/tex/extensions/require/require.js'
import '@mathjax/src/components/mjs/input/tex/extensions/setoptions/setoptions.js'
import '@mathjax/src/components/mjs/input/tex/extensions/tagformat/tagformat.js'
import '@mathjax/src/components/mjs/input/tex/extensions/texhtml/texhtml.js'
import '@mathjax/src/components/mjs/input/tex/extensions/textcomp/textcomp.js'
import '@mathjax/src/components/mjs/input/tex/extensions/textmacros/textmacros.js'
import '@mathjax/src/components/mjs/input/tex/extensions/unicode/unicode.js'
import '@mathjax/src/components/mjs/input/tex/extensions/units/units.js'
import '@mathjax/src/components/mjs/input/tex/extensions/upgreek/upgreek.js'
import '@mathjax/src/components/mjs/input/tex/extensions/verb/verb.js'

import createMathTexToMathML from './math-tex-to-mathml-core.js'

const TEX_EXTENSION_NAMES = [
  'action',
  'ams',
  'amscd',
  'autoload',
  'bbm',
  'bboldx',
  'bbox',
  'begingroup',
  'boldsymbol',
  'braket',
  'cancel',
  'cases',
  'centernot',
  'color',
  'colortbl',
  'colorv2',
  'configmacros',
  'dsfont',
  'empheq',
  'enclose',
  'extpfeil',
  'gensymb',
  'html',
  'mathtools',
  'mhchem',
  'newcommand',
  'noerrors',
  'noundefined',
  'physics',
  'require',
  'setoptions',
  'tagformat',
  'texhtml',
  'textcomp',
  'textmacros',
  'unicode',
  'units',
  'upgreek',
  'verb',
]

const texPackages = ['base', ...TEX_EXTENSION_NAMES]

const mditMathTexToMathML = createMathTexToMathML({ texPackages })

export default mditMathTexToMathML
