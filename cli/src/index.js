// Layer B CLI のエントリポイント。
// 使い方:
//   npm run lint -- --doc-url "https://docs.google.com/document/d/.../edit"
//   npm run lint -- --doc-id "1abcdef..." --format md --output report.md

import 'dotenv/config';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDoc } from './docFetcher.js';
import { runLayerB } from './runner.js';
import { formatOutput } from './output.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('tm-lint-b')
    .option('doc-url', { type: 'string', describe: 'Google Doc の URL' })
    .option('doc-id', { type: 'string', describe: 'Google Doc ID（URL の代わりに直接）' })
    .option('rules', { type: 'string', default: '../rules.json', describe: 'rules.json のパス（cli/ からの相対）' })
    .option('format', { type: 'string', choices: ['json', 'md'], default: 'json' })
    .option('output', { type: 'string', describe: '出力ファイル（省略時 stdout）' })
    .check(a => {
      if (!a['doc-url'] && !a['doc-id']) throw new Error('--doc-url または --doc-id が必要です');
      return true;
    })
    .help()
    .strict()
    .argv;

  const docId = argv['doc-id'] || extractDocId(argv['doc-url']);
  if (!docId) {
    throw new Error(`Doc ID を URL から抽出できませんでした: ${argv['doc-url']}`);
  }

  const rulesPath = path.resolve(__dirname, '..', argv.rules);
  const rules = JSON.parse(await fs.readFile(rulesPath, 'utf-8'));

  process.stderr.write(`[info] Doc ${docId} を取得中...\n`);
  const doc = await fetchDoc(docId);

  const layerBCount = rules.rules.filter(r => r.layer === 'B').length;
  process.stderr.write(`[info] Layer B ${layerBCount} ルールを判定中...\n`);
  const { findings, usage } = await runLayerB(doc, rules);

  const output = formatOutput(findings, argv.format, {
    rulesVersion: rules.version,
    docId,
    usage,
  });

  if (argv.output) {
    await fs.writeFile(argv.output, output, 'utf-8');
    process.stderr.write(`[info] ${findings.length} 件の Finding を ${argv.output} に書き出しました。\n`);
  } else {
    process.stdout.write(output);
  }

  process.stderr.write(`[info] LLM トークン: input=${usage.input_tokens}, output=${usage.output_tokens}, cache_read=${usage.cache_read_input_tokens}, cache_creation=${usage.cache_creation_input_tokens}\n`);
}

function extractDocId(url) {
  if (!url) return null;
  const m = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

main().catch(err => {
  process.stderr.write(`[error] ${err.message}\n`);
  if (err.stack && process.env.DEBUG) process.stderr.write(err.stack + '\n');
  process.exit(1);
});
