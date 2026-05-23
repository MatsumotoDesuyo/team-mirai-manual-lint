// Layer B ディスパッチャ。rules.json の layer === 'B' な行を取り出し、handlers から対応関数を呼ぶ。

import { extractParagraphs, formatDocForPrompt } from './docFetcher.js';
import { handlers } from './handlers/index.js';

const GUIDELINES_EXCERPT = `
# チームみらい マニュアル作成ガイドライン（抜粋）

## わかりやすさの基本
- 1 文 1 トピック。1 文は 50 字以内推奨、最大 100 字。
- 読点は 1 文に 3 つまで、漢字連続 6 字以内。
- 短い概要文 + 箇条書きで表現。

## 表現の簡潔化と明確化
- 冗長表現を削る。「〜することができる」→「〜できる」。
- 能動態を使う。受動態（〜される）を避け、「誰が何をするか」を明確に。
- 二重否定（〜しないわけではない）禁止。
- 曖昧副詞（適宜、適切に、しばらく、丁寧に）を避け、具体的・数値で。

## トーン
- 固すぎず、親切・丁寧・やさしく・楽しい。
- 守るべきルールについては厳格。
- 感情を強く刺激する表現は避ける。

## 読み手視点
- 運営側ではなく、読者（高校卒業直後・政治活動未経験のサポーター）の視点で書く。
`.trim();

/**
 * Doc 全文と「ガイドライン抜粋 + Doc 全文」を含む system プロンプトのキャッシュブロックを作る。
 * 各ルールでこれを共有することでプロンプトキャッシュが効く。
 */
function buildSystemBlocks(docText) {
  return [
    {
      type: 'text',
      text: GUIDELINES_EXCERPT,
    },
    {
      type: 'text',
      text: `# 対象マニュアル本文\n\n各段落は \`[N] テキスト\` 形式（N は段落インデックス）。\n\n${docText}`,
      // Doc 全文は長く、ルール毎に再利用するのでキャッシュ対象。
      cache_control: { type: 'ephemeral' },
    },
  ];
}

export async function runLayerB(doc, rules) {
  const paragraphs = extractParagraphs(doc);
  const docText = formatDocForPrompt(paragraphs);
  const systemBlocks = buildSystemBlocks(docText);

  const layerBRules = rules.rules.filter(r => r.layer === 'B');
  const findings = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;

  for (const rule of layerBRules) {
    if (!rule.handler || !rule.handler.startsWith('llm.')) {
      findings.push(makeMetaFinding(rule, 'INFO', `handler 形式が不正: ${rule.handler}`));
      continue;
    }
    const handlerName = rule.handler.replace(/^llm\./, '');
    const handler = handlers[handlerName];
    if (!handler) {
      findings.push(makeMetaFinding(rule, 'INFO', `CLI ハンドラ未実装: ${rule.handler}`, rule.message));
      continue;
    }

    try {
      process.stderr.write(`[${rule.id}] 判定中... `);
      const result = await handler({ doc, paragraphs, systemBlocks, rule, params: rule.params || {} });
      const ruleFindings = result.findings || [];
      findings.push(...ruleFindings);
      if (result.usage) {
        totalInputTokens += result.usage.input_tokens || 0;
        totalOutputTokens += result.usage.output_tokens || 0;
        totalCacheReadTokens += result.usage.cache_read_input_tokens || 0;
        totalCacheCreationTokens += result.usage.cache_creation_input_tokens || 0;
      }
      process.stderr.write(`${ruleFindings.length} 件\n`);
    } catch (e) {
      process.stderr.write(`エラー\n`);
      findings.push(makeMetaFinding(rule, 'INFO', `ハンドラ実行時エラー: ${e.message}`));
    }
  }

  return {
    findings,
    usage: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      cache_read_input_tokens: totalCacheReadTokens,
      cache_creation_input_tokens: totalCacheCreationTokens,
    },
  };
}

function makeMetaFinding(rule, severity, message, implementationNote) {
  return {
    ruleId: rule.id,
    severity,
    guidelineRef: rule.guideline_ref || '',
    location: { type: 'document', index: -1, hint: 'CLI メタ' },
    startOffset: null,
    endOffset: null,
    snippet: '',
    message,
    implementationNote: implementationNote || '',
    autoFixable: false,
  };
}
