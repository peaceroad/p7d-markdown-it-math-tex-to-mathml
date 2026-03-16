import { performance } from 'node:perf_hooks'

import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

const DEFAULT_ROUNDS = 9
const DEFAULT_WARMUP = 2
const DEFAULT_INIT_BATCH = 5
const DEFAULT_RENDER_BATCH = 3

const inlineCorpus = Array.from(
  { length: 180 },
  (_, i) => `Inline ${i}: $x_${i}+y_${i}=z_${i}$.`
).join('\n')

const layoutTargetCorpus = Array.from(
  { length: 160 },
  (_, i) => `Layout ${i}: $f'(x)+|x|^2+\\int_0^1 x^{${i % 4}}\\,dx$.`
).join('\n')

const layoutNoTargetCorpus = Array.from(
  { length: 180 },
  (_, i) => `Plain ${i}: $x_${i}+y_${i}=z_${i}$.`
).join('\n')

const blockCorpus = Array.from(
  { length: 80 },
  (_, i) => `$$\n\\sum_{k=0}^{${(i % 6) + 2}} a_k x^k = \\frac{x^2+${i + 1}}{${(i % 5) + 2}}\n$$`
).join('\n\n')

const benchmarkCases = {
  init: [
    { name: 'mathml-default', options: { setMathJaxDataAttrs: false } },
    { name: 'mathml-layoutclass', options: { setMathJaxDataAttrs: false, mathmlLayoutClass: true } },
    {
      name: 'svg-linebreaks',
      options: {
        useSvg: true,
        setMathJaxDataAttrs: false,
        svgLinebreaks: { inline: true, width: '6em' },
      },
    },
  ],
  render: [
    {
      name: 'mathml-inline-default',
      options: { setMathJaxDataAttrs: false },
      source: inlineCorpus,
    },
    {
      name: 'mathml-block-default',
      options: { setMathJaxDataAttrs: false },
      source: blockCorpus,
    },
    {
      name: 'mathml-layoutclass-no-targets',
      options: { setMathJaxDataAttrs: false, mathmlLayoutClass: true },
      source: layoutNoTargetCorpus,
    },
    {
      name: 'mathml-layoutclass-targets',
      options: { setMathJaxDataAttrs: false, mathmlLayoutClass: true },
      source: layoutTargetCorpus,
    },
    {
      name: 'svg-linebreaks',
      options: {
        useSvg: true,
        setMathJaxDataAttrs: false,
        svgLinebreaks: { inline: true, width: '6em' },
      },
      source: layoutTargetCorpus,
    },
  ],
}

const parseIntegerFlag = (name, fallback) => {
  const prefix = `--${name}=`
  const arg = process.argv.find((entry) => entry.startsWith(prefix))
  if (!arg) return fallback
  const value = Number.parseInt(arg.slice(prefix.length), 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

const formatMs = (value) => `${value.toFixed(2)} ms`

const createMd = (options) => mdit({ html: true }).use(mditMathTexToMathML, options)

const benchmarkInit = (definition, rounds, batchSize) => {
  const samples = []
  for (let round = 0; round < rounds; round++) {
    const start = performance.now()
    for (let i = 0; i < batchSize; i++) {
      createMd(definition.options)
    }
    const end = performance.now()
    samples.push((end - start) / batchSize)
  }
  return median(samples)
}

const benchmarkRender = (definition, rounds, warmupRounds, batchSize) => {
  const md = createMd(definition.options)
  for (let round = 0; round < warmupRounds; round++) {
    md.render(definition.source)
  }

  const samples = []
  for (let round = 0; round < rounds; round++) {
    const start = performance.now()
    for (let i = 0; i < batchSize; i++) {
      md.render(definition.source)
    }
    const end = performance.now()
    samples.push((end - start) / batchSize)
  }
  return median(samples)
}

const rounds = parseIntegerFlag('rounds', DEFAULT_ROUNDS)
const warmupRounds = parseIntegerFlag('warmup', DEFAULT_WARMUP)
const initBatchSize = parseIntegerFlag('init-batch', DEFAULT_INIT_BATCH)
const renderBatchSize = parseIntegerFlag('render-batch', DEFAULT_RENDER_BATCH)

console.log(`Benchmark config: rounds=${rounds}, warmup=${warmupRounds}, initBatch=${initBatchSize}, renderBatch=${renderBatchSize}`)

console.log('\n[init]')
for (const definition of benchmarkCases.init) {
  const result = benchmarkInit(definition, rounds, initBatchSize)
  console.log(`${definition.name}: median ${formatMs(result)} per md.use()`)
}

console.log('\n[render]')
for (const definition of benchmarkCases.render) {
  const result = benchmarkRender(definition, rounds, warmupRounds, renderBatchSize)
  console.log(`${definition.name}: median ${formatMs(result)} per render`)
}
