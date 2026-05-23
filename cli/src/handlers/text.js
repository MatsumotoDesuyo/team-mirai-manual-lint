// Layer B / TEXT 系ハンドラ。
// 本実装: B-TEXT-014（受動態回避）。
// 他のルールは未実装（handlers/index.js で未登録）。

import { callLLM, parseLLMJson } from '../llmClient.js';

/**
 * B-TEXT-014 受動態回避。
 * Doc 全文（system でキャッシュ済み）に対して、受動態が使われている箇所を LLM に列挙させる。
 * 自然な受動表現（法令的記述、被害者主語が重要な文脈等）は除外するよう指示。
 */
export async function checkPassiveVoice({ systemBlocks, rule, params }) {
  const maxExamples = params.max_examples || 10;

  const userPrompt = `# ルール: ${rule.id} ${rule.guideline_ref}

対象マニュアル本文（system 側に展開済み）から、受動態（〜される / 〜られる）が使われている箇所を抽出してください。

## 除外基準
以下のような自然な受動表現は対象外（誤検出を避けるため除外）:
- 法令的記述（例: 「禁止されています」「許可されています」）
- 被害・受身の主語が重要で能動化すると意味が変わる場合（例: 「通行人に声をかけられた」のように読み手の受け身が主題）
- 慣用句・定型句（例: 「議員と呼ばれる」「と言われている」）

## 出力形式
\`\`\`json
{
  "findings": [
    {
      "paragraphIndex": 5,
      "snippet": "受動態を含む 30〜80 字程度の引用（段落本文から原文ママで）",
      "passive_phrase": "受動態の該当語句（例: 撤去されます）",
      "suggestion": "能動態への書き換え案（短い 1 行）",
      "reason": "なぜ能動化すべきかの短い理由"
    }
  ]
}
\`\`\`

最大 ${maxExamples} 件まで。重要度の高い順（自然さで除外しきれず、改善効果が大きいもの順）に絞ってください。
受動態が見つからない場合は \`{"findings": []}\` を返してください。
出力は JSON のみ。前後に説明文や Markdown 装飾を付けないでください。`;

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
