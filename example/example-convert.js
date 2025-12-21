import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'

import plugin from '../index.js'

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = process.platform === 'win32'
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

const wrapHtml = (body) => `<!DOCTYPE html>
<html>
<title>Math Test</title>
<body>
<main>
${body}</main>
</body>
</html>
`

const renderMarkdown = (inputPath, outputPath, options) => {
  const markdown = fs.readFileSync(inputPath, 'utf8')
  const md = mdit({ html: true }).use(plugin, options)
  const html = wrapHtml(md.render(markdown))
  fs.writeFileSync(outputPath, html, 'utf8')
}

const jobs = [
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-mathml.html'),
    options: { removeMathJaxData: true },
  },
  {
    input: path.join(__dirname, 'example-tex.md'),
    output: path.join(__dirname, 'example-svg.html'),
    options: { useSvg: true, removeMathJaxData: true },
  },
]

for (const job of jobs) {
  renderMarkdown(job.input, job.output, job.options)
  console.log(`Wrote ${job.output}`)
}
