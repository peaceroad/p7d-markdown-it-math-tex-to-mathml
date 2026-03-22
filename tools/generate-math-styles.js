import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const styleSrcDir = path.join(__dirname, '..', 'style-src')
const styleDir = path.join(__dirname, '..', 'style')

const buildTargets = [
  {
    output: 'math-newcm.css',
    sources: ['math-mathml-newcm-font.css', 'math-mathml-base.css', 'math-mathml-presentation.css'],
  },
  {
    output: 'math-stix2.css',
    sources: ['math-mathml-stix2-font.css', 'math-mathml-base.css', 'math-mathml-presentation.css'],
  },
  {
    output: 'math-svg.css',
    sources: ['math-svg.css'],
  },
]

const readSource = async (filename) => {
  const filePath = path.join(styleSrcDir, filename)
  const content = await fs.readFile(filePath, 'utf8')
  return content.trim()
}

const stripCssComments = (content) => content.replace(/\/\*[\s\S]*?\*\//g, '').trim()

const compactGeneratedCss = (content) =>
  content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

for (const target of buildTargets) {
  const parts = await Promise.all(target.sources.map(readSource))
  const output = `${compactGeneratedCss(stripCssComments(parts.join('\n\n')))}\n`
  await fs.writeFile(path.join(styleDir, target.output), output, 'utf8')
  console.log(`Wrote style/${target.output}`)
}
