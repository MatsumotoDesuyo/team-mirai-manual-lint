// Layer B / TEXT 系ハンドラ。
//
// プロンプトは .claude/skills/layer-b-lint/prompts/ の正本を読み込んで使う。
// skill 経由 (Claude Code) と CLI 経由 (このファイル) で同じプロンプトを共有することで、
// 運用経路によって判定がブレないようにする。
//
// makeTextHandler パターンで全 TEXT 系ハンドラを共通化。新ルール追加時は:
//   1. .claude/skills/layer-b-lint/prompts/<name>.md を追加
//   2. このファイルで `export const checkXxx = makeTextHandler('<name>.md');` を追加
//   3. handlers/index.js に登録
//   4. rules.json に Layer B 行を追加（handler: "llm.checkXxx"）

import { callLLM, parseLLMJson } from '../llmClient.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.resolve(__dirname, '..', '..', '..', '.claude', 'skills', 'layer-b-lint', 'prompts');

const promptCache = new Map();

async function loadPrompt(filename) {
  if (promptCache.has(filename)) return promptCache.get(filename);
  const p = path.join(PROMPTS_DIR, filename);
  try {
    const content = await fs.readFile(p, 'utf-8');
    promptCache.set(filename, content);
    return content;
  } catch (e) {
    throw new Error(
      `プロンプトファイルが読めません: ${p}\n` +
      '.claude/skills/layer-b-lint/prompts/ 配下の正本を確認してください。'
    );
  }
}

/**
 * TEXT 系ハンドラのジェネレータ。プロンプトファイル名を渡すと、共通の判定パイプラインで
 * 動くハンドラ関数を返す。
 */
function makeTextHandler(promptFilename) {
  return async function ({ systemBlocks, rule, params }) {
    const maxExamples = params?.max_examples || 15;
    const promptBody = await loadPrompt(promptFilename);

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

    const findings = (parsed.findings || []).map(f => normalizeFinding(f, rule));
    return { findings, usage: res.usage };
  };
}

// 共通フィールド以外は `extra` にまとめて格納し、output.js で展開表示する。
const COMMON_KEYS = new Set(['paragraphIndex', 'snippet', 'suggestion', 'reason']);

function normalizeFinding(f, rule) {
  const extra = {};
  for (const k of Object.keys(f)) {
    if (!COMMON_KEYS.has(k)) extra[k] = f[k];
  }
  return {
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
    extra: Object.keys(extra).length ? extra : null,
    implementationNote: '',
    autoFixable: false,
  };
}

// 各ハンドラはプロンプトファイル名を指定するだけで生成される。
export const checkSentenceTopic = makeTextHandler('sentence-one-topic.md');
export const checkSentenceLength = makeTextHandler('sentence-length.md');
export const checkMissingParticle = makeTextHandler('missing-particle.md');
export const checkRanukiKotoba = makeTextHandler('ranuki.md');
export const checkGaConsecutive = makeTextHandler('ga-consecutive.md');
export const checkModifierProximity = makeTextHandler('modifier-proximity.md');
export const checkVerboseExpression = makeTextHandler('verbose-expression.md');
export const checkPassiveVoice = makeTextHandler('passive-voice.md');
export const checkDoubleNegation = makeTextHandler('double-negation.md');
export const checkAmbiguousAdverb = makeTextHandler('ambiguous-adverb.md');
