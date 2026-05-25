// Layer B / TEXT 系ハンドラ。
// 本実装: B-TEXT-014（受動態回避）。
// 他のルールは未実装（handlers/index.js で未登録）。
//
// プロンプト本文は .claude/skills/layer-b-lint/prompts/ の正本を読み込んで使う。
// skill 経由 (Claude Code) と CLI 経由 (このファイル) で同じプロンプトを共有することで、
// 運用経路によって判定がブレないようにする。

import { callLLM, parseLLMJson } from '../llmClient.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '..', '..', '..', '.claude', 'skills', 'layer-b-lint', 'prompts');

async function loadPrompt(filename) {
  const p = path.join(PROMPTS_DIR, filename);
  try {
    return await fs.readFile(p, 'utf-8');
  } catch (e) {
    throw new Error(
      `プロンプトファイルが読めません: ${p}\n` +
      'skills/layer-b-lint/prompts/ 配下の正本を確認してください。'
    );
  }
}

/**
 * B-TEXT-014 受動態回避。
 * Doc 全文（system でキャッシュ済み）に対して、受動態が使われている箇所を LLM に列挙させる。
 * 判定基準は .claude/skills/layer-b-lint/prompts/passive-voice.md と共有。
 */
export async function checkPassiveVoice({ systemBlocks, rule, params }) {
  const maxExamples = params.max_examples || 15;
  const promptBody = await loadPrompt('passive-voice.md');

  const userPrompt = `# ${rule.id} 判定

以下のルール定義に従って、system 側に展開されている対象マニュアル本文を解析してください。

---

${promptBody}

---

# CLI 経由の追加指示
- このリクエストは CLI 経由です。**JSON のみ**で返してください。説明文・コードブロックは付けないでください。
- 最大 ${maxExamples} 件まで。
- 該当なしの場合は \`{"findings": []}\` を返してください。
`;

  const res = await callLLM(systemBlocks, userPrompt, { maxTokens: 4000, temperature: 0.0 });

  let parsed;
  try {
    parsed = parseLLMJson(res.text);
  } catch (e) {
    const preview = res.text.length > 300 ? res.text.substring(0, 300) + '…' : res.text;
    throw new Error(`LLM 出力の JSON パース失敗: ${e.message}\n出力先頭: ${preview}`);
  }

  const findings = (parsed.findings || []).map(f => ({
    ruleId: rule.id,
    severity: rule.severity || 'WARN',
    guidelineRef: rule.guideline_ref || '',
    location: {
      type: 'paragraph',
      index: typeof f.paragraphIndex === 'number' ? f.paragraphIndex : -1,
      hint: typeof f.paragraphIndex === 'number' ? `段落 ${f.paragraphIndex + 1}` : '',
    },
    startOffset: null,
    endOffset: null,
    snippet: f.snippet || '',
    message: rule.message + (f.reason ? `（${f.reason}）` : ''),
    suggestion: f.suggestion || '',
    passivePhrase: f.passive_phrase || '',
    implementationNote: '',
    autoFixable: false,
  }));

  return { findings, usage: res.usage };
}
