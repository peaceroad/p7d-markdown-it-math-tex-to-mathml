import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import { renderBrowserEntry } from '../tools/generate-browser-entry.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const browserEntryPath = path.resolve(__dirname, '..', 'script', 'math-tex-to-mathml.js')

const actual = fs.readFileSync(browserEntryPath, 'utf8')
const expected = renderBrowserEntry()

assert.strictEqual(
  actual,
  expected,
  'Browser entry is out of sync with MathJax source. Run `npm run build:browser-entry`.'
)

console.log('Passed browser entry sync test.')
