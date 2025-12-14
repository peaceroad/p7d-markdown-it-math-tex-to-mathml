import assert from 'assert'
import fs from 'fs'
import path from 'path'
import mdit from 'markdown-it'

import mditMathTexToMathML from '../index.js'

// Ignore trailing whitespace differences when fixtures are hand-formatted.
const normalizeTrailing = (s) => `${s.replace(/[ \t]+$/gm, '').trimEnd()}\n`

const configs = [
  {
    name: 'removeMathJaxData=true',
    option: { removeMathJaxData: true },
    file: 'examples.txt',
    normalize: normalizeTrailing,
  },
  {
    name: 'removeMathJaxData=false',
    option: { removeMathJaxData: false },
    file: 'examples-with-data.txt',
    normalize: normalizeTrailing,
  },
  {
    name: 'useSvg',
    option: { useSvg: true, removeMathJaxData: true, linebreaks: { width: '6em', inline: true } },
    file: 'examples-svg.txt',
    normalize: normalizeTrailing,
  },
]

let __dirname = path.dirname(new URL(import.meta.url).pathname)
const isWindows = (process.platform === 'win32')
if (isWindows) {
  __dirname = __dirname.replace(/^\/+/, '').replace(/\//g, '\\')
}

const testData = configs.map((cfg) => ({
  name: cfg.name,
  path: __dirname + path.sep + cfg.file,
  option: cfg.option,
}))

const getTestData = (pat) => {
  let ms = [];
  if(!fs.existsSync(pat)) {
    console.log('No exist: ' + pat)
    return ms
  }
  const exampleCont = fs.readFileSync(pat, 'utf-8').trim();

  let ms0 = exampleCont.split(/\n*\[Markdown\]\n/);
  let n = 1;
  while(n < ms0.length) {
    let mhs = ms0[n].split(/\n+\[HTML[^\]]*?\]\n/);
    let i = 1;
    while (i < 2) {
      if (mhs[i] === undefined) {
        mhs[i] = '';
      } else {
        mhs[i] = mhs[i].replace(/$/,'\n');
      }
      i++;
    }
    ms[n] = {
      "markdown": mhs[0],
      "html": mhs[1],
    };
    n++;
  }
  return ms
}

const runTest = (process, pat, pass, testId, normalize = normalizeTrailing) => {
  console.log('===========================================================')
  console.log(pat)
  let ms = getTestData(pat)
  if (ms.length === 0) return
  let n = 1;
  let end = ms.length - 1
  if(testId) {
    if (testId[0]) n = testId[0]
    if (testId[1]) {
      if (ms.length >= testId[1]) {
        end = testId[1]
      }
    }
  }

  while(n <= end) {
    if (!ms[n]
    //|| n != 14
    ) {
      n++
      continue
    }

    const m = ms[n].markdown;
    const h = normalize(process.render(m))
    console.log('Test: ' + n + ' >>>');
    try {
      assert.strictEqual(h, normalize(ms[n].html));
    } catch(e) {
      pass = false
      //console.log('Test: ' + n + ' >>>');
      //console.log(opt);
      console.log(ms[n].markdown);
      console.log('incorrect:');
      console.log('H: ' + h +'C: ' + ms[n].html);
    }
    n++;
  }
  return pass
}

let pass = true
for (const td of testData) {
  console.log('Running:', td.name)
  const md = mdit({ html: true }).use(mditMathTexToMathML, td.option)
  pass = runTest(md, td.path, pass, undefined, td.normalize)
}

if (pass) console.log('Passed all test.')
