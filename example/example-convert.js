import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'
import { createRequire } from 'node:module'

import plugin from '../index.js'

const require = createRequire(import.meta.url)

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = process.platform === 'win32'
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

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

const wrapHtml = (body) => `<!DOCTYPE html>
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
<link rel="stylesheet" type="text/css" href="../style/math-newcm.css">
</head>
<body>
<main>
${body}</main>
${childSyncScript}
</body>
</html>
`

const renderMarkdown = (inputPath, outputPath, options, transformHtml = null) => {
  const markdown = fs.readFileSync(inputPath, 'utf8')
  const md = mdit({ html: true }).use(plugin, options)
  let html = wrapHtml(md.render(markdown))
  if (typeof transformHtml === 'function') {
    html = transformHtml(html)
  }
  fs.writeFileSync(outputPath, html, 'utf8')
}

const replaceStylesheet = (html, newHref) =>
  html.replace('../style/math-newcm.css', newHref)

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

const jobs = [
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml.html'),
    options: mathmlBaseOptions,
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml-class-map.html'),
    options: mathmlLayoutOptions,
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml-newcm.html'),
    options: mathmlBaseOptions,
    transformHtml: (html) => replaceStylesheet(html, '../style/math-newcm.css'),
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml-stix2.html'),
    options: mathmlBaseOptions,
    transformHtml: (html) => replaceStylesheet(html, '../style/math-stix2.css'),
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml-class-map-newcm.html'),
    options: mathmlLayoutOptions,
    transformHtml: (html) => replaceStylesheet(html, '../style/math-newcm.css'),
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml-class-map-stix2.html'),
    options: mathmlLayoutOptions,
    transformHtml: (html) => replaceStylesheet(html, '../style/math-stix2.css'),
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
  svgOutputs[fontJob.name] = `example-svg-${fontJob.name}.html`
  jobs.push({
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, svgOutputs[fontJob.name]),
    options: { useSvg: true, svgFont: fontJob.svgFont, setMathJaxDataAttrs: false },
    transformHtml: (html) => replaceStylesheet(html, '../style/math-svg.css'),
  })
}

for (const job of jobs) {
  renderMarkdown(job.input, job.output, job.options, job.transformHtml)
  console.log(`Wrote ${job.output}`)
}

writeCompareHtml(
  path.join(__dirname, 'example-mathml-compare.html'),
  'MathML compare: New Computer Modern vs STIX Two Math',
  { label: 'New Computer Modern', src: 'example-mathml-newcm.html' },
  { label: 'STIX Two Math', src: 'example-mathml-stix2.html' }
)
console.log(`Wrote ${path.join(__dirname, 'example-mathml-compare.html')}`)

writeCompareHtml(
  path.join(__dirname, 'example-mathml-class-map-compare.html'),
  'MathML class map compare: New Computer Modern vs STIX Two Math',
  { label: 'New Computer Modern', src: 'example-mathml-class-map-newcm.html' },
  { label: 'STIX Two Math', src: 'example-mathml-class-map-stix2.html' }
)
console.log(`Wrote ${path.join(__dirname, 'example-mathml-class-map-compare.html')}`)

if (svgOutputs.newcm && svgOutputs.stix2) {
  writeCompareHtml(
    path.join(__dirname, 'example-svg-compare.html'),
    'SVG compare: New Computer Modern vs STIX Two Math',
    { label: 'New Computer Modern', src: svgOutputs.newcm },
    { label: 'STIX Two Math', src: svgOutputs.stix2 }
  )
  console.log(`Wrote ${path.join(__dirname, 'example-svg-compare.html')}`)
} else {
  console.warn('Skipping SVG compare output; both newcm and stix2 SVG outputs are required.')
}
