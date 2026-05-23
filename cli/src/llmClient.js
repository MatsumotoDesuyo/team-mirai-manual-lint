// Anthropic Claude API ラッパー。プロンプトキャッシュ対応。
// Doc 全文 + ガイドライン抜粋を system 側に置いてキャッシュ。各ルールごとに user メッセージで判定指示。

import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

if (!apiKey) {
  // 起動時には警告のみ。実行時に投げる。
  process.stderr.write('[WARN] ANTHROPIC_API_KEY が設定されていません。.env を確認してください。\n');
}

const client = new Anthropic({ apiKey });

/**
 * LLM 呼び出し。
 * @param {Array<{type:string, text:string, cache_control?:object}>} systemBlocks - system プロンプトのブロック配列
 * @param {string} userPrompt - 当該ルールの判定指示
 * @param {object} options - { maxTokens, temperature }
 */
export async function callLLM(systemBlocks, userPrompt, options = {}) {
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY が未設定です。.env を確認してください。');
  }

  const res = await client.messages.create({
    model,
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature ?? 0.0,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = res.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n');

  return {
    text,
    usage: res.usage,
    model: res.model,
  };
}

/**
 * モデル出力から JSON を抽出する。コードブロックで囲まれている場合は剥がす。
 */
export function parseLLMJson(text) {
  let cleaned = text.trim();
  // ```json ... ``` または ``` ... ``` を剥がす
  const fenceMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```\s*$/);
  if (fenceMatch) cleaned = fenceMatch[1].trim();
  // 先頭が { や [ でない場合、最初の { か [ を探す
  const firstBrace = Math.min(
    cleaned.indexOf('{') === -1 ? Infinity : cleaned.indexOf('{'),
    cleaned.indexOf('[') === -1 ? Infinity : cleaned.indexOf('[')
  );
  if (firstBrace > 0 && firstBrace < Infinity) cleaned = cleaned.substring(firstBrace);
  return JSON.parse(cleaned);
}
