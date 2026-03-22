import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import plugin from '../index.js'

const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const childSyncScript = `
<script>
  (() => {
    if (window.parent === window) return;
    const getRoot = () => document.scrollingElement || document.documentElement || document.body;
    let syncing = false;
    window.addEventListener('scroll', () => {
      if (syncing) return;
      const root = getRoot();
      if (!root) return;
      const max = root.scrollHeight - root.clientHeight;
      const ratio = max > 0 ? root.scrollTop / max : 0;
      window.parent.postMessage({ type: 'math-compare-scroll', ratio }, '*');
    }, { passive: true });
    window.addEventListener('message', (event) => {
      const data = event.data;
      if (!data || data.type !== 'math-compare-scroll' || typeof data.ratio !== 'number') return;
      const root = getRoot();
      if (!root) return;
      const max = root.scrollHeight - root.clientHeight;
      syncing = true;
      root.scrollTop = data.ratio * max;
      requestAnimationFrame(() => {
        syncing = false;
      });
    });
  })();
</script>
`

const GENERATED_DIR = path.join(__dirname, 'generated')
const GENERATED_PAGES_DIR = path.join(GENERATED_DIR, 'pages')
const GENERATED_COMPARE_DIR = path.join(GENERATED_DIR, 'compare')
const SOURCE_DIR = path.join(__dirname, 'src')

const wrapHtml = (body, stylesheetHref = '../../../style/math-newcm.css') => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Math Test</title>
<style>
  main {
    inline-size: 680px;
    margin: 1rem auto;
  }
</style>
<link rel="stylesheet" type="text/css" href="${stylesheetHref}">
</head>
<body>
<main>
${body}</main>
${childSyncScript}
</body>
</html>
`

const renderMarkdown = (inputPath, outputPath, options, { stylesheetHref } = {}) => {
  const markdown = fs.readFileSync(inputPath, 'utf8')
  const md = mdit({ html: true }).use(plugin, options)
  const html = wrapHtml(md.render(markdown), stylesheetHref)
  fs.writeFileSync(outputPath, html, 'utf8')
}

const writeCompareHtml = (outputPath, title, left, right) => {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  body {
    margin: 0;
    font-family: system-ui, sans-serif;
  }
  main {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    height: 100vh;
  }
  section {
    display: flex;
    flex-direction: column;
    min-width: 0;
    border-left: 1px solid #ddd;
  }
  section:first-child {
    border-left: none;
  }
  header {
    padding: 0.5rem 0.75rem;
    background: #f5f5f5;
    font-weight: 600;
    border-bottom: 1px solid #ddd;
  }
  iframe {
    flex: 1;
    width: 100%;
    border: 0;
  }
</style>
</head>
<body>
<main>
  <section>
    <header>${left.label}</header>
    <iframe src="${left.src}" title="${left.label}" data-compare="left"></iframe>
  </section>
  <section>
    <header>${right.label}</header>
    <iframe src="${right.src}" title="${right.label}" data-compare="right"></iframe>
  </section>
</main>
<script>
  const leftFrame = document.querySelector('iframe[data-compare="left"]');
  const rightFrame = document.querySelector('iframe[data-compare="right"]');
  let syncing = false;

  const relay = (source) => {
    if (source === leftFrame?.contentWindow) return rightFrame?.contentWindow;
    if (source === rightFrame?.contentWindow) return leftFrame?.contentWindow;
    return null;
  };

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.type !== 'math-compare-scroll' || typeof data.ratio !== 'number') return;
    if (syncing) return;
    const target = relay(event.source);
    if (!target) return;
    syncing = true;
    target.postMessage(data, '*');
    requestAnimationFrame(() => {
      syncing = false;
    });
  });
</script>
</body>
</html>
`
  fs.writeFileSync(outputPath, html, 'utf8')
}

let mathjaxRequire = undefined
const resolveMathjaxRequire = () => {
  if (mathjaxRequire !== undefined) return mathjaxRequire
  try {
    const mathjaxPkg = require.resolve('@mathjax/src/package.json')
    mathjaxRequire = createRequire(mathjaxPkg)
  } catch {
    mathjaxRequire = null
  }
  return mathjaxRequire
}

const canResolve = (specifier) => {
  try {
    require.resolve(specifier)
    return true
  } catch {
    const fallback = resolveMathjaxRequire()
    if (!fallback) return false
    try {
      fallback.resolve(specifier)
      return true
    } catch {
      return false
    }
  }
}

const mathmlBaseOptions = { setMathJaxDataAttrs: false }
const mathmlLayoutOptions = { setMathJaxDataAttrs: false, mathmlLayoutClass: true }
const mathmlMathjaxOptions = { setMathJaxDataAttrs: false, mathmlMode: 'mathjax' }

const jobs = [
  {
    input: path.join(SOURCE_DIR, 'example-tex.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-mathml.html'),
    options: mathmlBaseOptions,
  },
  {
    input: path.join(SOURCE_DIR, 'example-tex.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-mathml-class-map.html'),
    options: mathmlLayoutOptions,
  },
  {
    input: path.join(SOURCE_DIR, 'example-tex.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-mathml-stix2.html'),
    options: mathmlBaseOptions,
    stylesheetHref: '../../../style/math-stix2.css',
  },
  {
    input: path.join(SOURCE_DIR, 'example-tex.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-mathml-class-map-stix2.html'),
    options: mathmlLayoutOptions,
    stylesheetHref: '../../../style/math-stix2.css',
  },
  {
    input: path.join(SOURCE_DIR, 'example-rendering-check.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-rendering-check-mathml.html'),
    options: mathmlBaseOptions,
  },
  {
    input: path.join(SOURCE_DIR, 'example-rendering-check.md'),
    output: path.join(GENERATED_PAGES_DIR, 'example-rendering-check-mathml-mathjax.html'),
    options: mathmlMathjaxOptions,
  },
]

const svgFontJobs = [
  {
    name: 'newcm',
    svgFont: 'newcm',
    module: '@mathjax/mathjax-newcm-font',
  },
  {
    name: 'stix2',
    svgFont: 'stix2',
    module: '@mathjax/mathjax-stix2-font',
  },
]

const svgOutputs = {}

for (const fontJob of svgFontJobs) {
  const modulePath = `${fontJob.module}/js/svg.js`
  if (!canResolve(modulePath)) {
    console.warn(`Skipping ${fontJob.name} SVG output; install ${fontJob.module} to enable it.`)
    continue
  }
  svgOutputs[fontJob.name] = fontJob.name === 'newcm'
    ? 'example-svg.html'
    : `example-svg-${fontJob.name}.html`
  jobs.push({
    input: path.join(SOURCE_DIR, 'example-tex.md'),
    output: path.join(GENERATED_PAGES_DIR, svgOutputs[fontJob.name]),
    options: { useSvg: true, svgFont: fontJob.svgFont, setMathJaxDataAttrs: false },
    stylesheetHref: '../../../style/math-svg.css',
  })
  if (fontJob.name === 'newcm') {
    jobs.push({
      input: path.join(SOURCE_DIR, 'example-rendering-check.md'),
      output: path.join(GENERATED_PAGES_DIR, 'example-rendering-check-svg.html'),
      options: { useSvg: true, svgFont: fontJob.svgFont, setMathJaxDataAttrs: false },
      stylesheetHref: '../../../style/math-svg.css',
    })
  }
}

fs.mkdirSync(GENERATED_PAGES_DIR, { recursive: true })
fs.mkdirSync(GENERATED_COMPARE_DIR, { recursive: true })

for (const job of jobs) {
  renderMarkdown(job.input, job.output, job.options, {
    stylesheetHref: job.stylesheetHref,
  })
  console.log(`Wrote ${job.output}`)
}

writeCompareHtml(
  path.join(GENERATED_COMPARE_DIR, 'example-mathml-compare.html'),
  'MathML compare: browser mode with NewCM vs STIX2 baselines',
  { label: "MathML (`mathmlMode: 'browser'`, `math-newcm.css`)", src: '../pages/example-mathml.html' },
  { label: "MathML (`mathmlMode: 'browser'`, `math-stix2.css`)", src: '../pages/example-mathml-stix2.html' }
)
console.log(`Wrote ${path.join(GENERATED_COMPARE_DIR, 'example-mathml-compare.html')}`)

writeCompareHtml(
  path.join(GENERATED_COMPARE_DIR, 'example-mathml-class-map-compare.html'),
  'MathML class-map compare: browser mode with NewCM vs STIX2 baselines',
  { label: "MathML + class map (`mathmlMode: 'browser'`, `math-newcm.css`)", src: '../pages/example-mathml-class-map.html' },
  { label: "MathML + class map (`mathmlMode: 'browser'`, `math-stix2.css`)", src: '../pages/example-mathml-class-map-stix2.html' }
)
console.log(`Wrote ${path.join(GENERATED_COMPARE_DIR, 'example-mathml-class-map-compare.html')}`)

if (svgOutputs.newcm && svgOutputs.stix2) {
  writeCompareHtml(
    path.join(GENERATED_COMPARE_DIR, 'example-svg-compare.html'),
    'SVG compare: newcm vs stix2',
    { label: "SVG (`useSvg: true`, `svgFont: 'newcm'`)", src: `../pages/${svgOutputs.newcm}` },
    { label: "SVG (`useSvg: true`, `svgFont: 'stix2'`)", src: `../pages/${svgOutputs.stix2}` }
  )
  console.log(`Wrote ${path.join(GENERATED_COMPARE_DIR, 'example-svg-compare.html')}`)
} else {
  console.warn('Skipping SVG compare output; both newcm and stix2 SVG outputs are required.')
}

writeCompareHtml(
  path.join(GENERATED_COMPARE_DIR, 'example-rendering-check-compare.html'),
  'Rendering check compare: browser-mode MathML vs SVG',
  { label: "MathML (`mathmlMode: 'browser'`, `math-newcm.css`)", src: '../pages/example-rendering-check-mathml.html' },
  { label: "SVG (`useSvg: true`, `svgFont: 'newcm'`)", src: '../pages/example-rendering-check-svg.html' }
)
console.log(`Wrote ${path.join(GENERATED_COMPARE_DIR, 'example-rendering-check-compare.html')}`)

writeCompareHtml(
  path.join(GENERATED_COMPARE_DIR, 'example-rendering-check-mode-compare.html'),
  'Rendering check compare: browser MathML vs MathJax MathML',
  { label: "MathML (`mathmlMode: 'browser'`, `math-newcm.css`)", src: '../pages/example-rendering-check-mathml.html' },
  { label: "MathML (`mathmlMode: 'mathjax'`, `math-newcm.css`)", src: '../pages/example-rendering-check-mathml-mathjax.html' }
)
console.log(`Wrote ${path.join(GENERATED_COMPARE_DIR, 'example-rendering-check-mode-compare.html')}`)
