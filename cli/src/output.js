// 出力フォーマッタ。JSON / Markdown を切り替えて返す。
// Layer A 側の Finding 形式と互換のあるキー（ruleId / severity / guidelineRef / location / snippet / message）を維持する。

export function formatOutput(findings, format, meta) {
  if (format === 'md') {
    return formatMarkdown(findings, meta);
  }
  return JSON.stringify({ meta, findings }, null, 2) + '\n';
}

function formatMarkdown(findings, meta) {
  const lines = [];
  lines.push(`# Layer B チェック結果`);
  lines.push('');
  lines.push(`- 実行: ${new Date().toISOString()}`);
  if (meta.rulesVersion) lines.push(`- rules.json バージョン: ${meta.rulesVersion}`);
  if (meta.docId) lines.push(`- Doc ID: ${meta.docId}`);
  if (meta.usage) {
    const u = meta.usage;
    lines.push(`- LLM トークン: input=${u.input_tokens}, output=${u.output_tokens}, cache_read=${u.cache_read_input_tokens}, cache_creation=${u.cache_creation_input_tokens}`);
  }
  lines.push(`- 件数: ${findings.length}`);
  lines.push('');

  const bySeverity = { ERROR: [], WARN: [], INFO: [] };
  findings.forEach(f => (bySeverity[f.severity] || bySeverity.INFO).push(f));

  for (const [sev, items] of Object.entries(bySeverity)) {
    if (!items.length) continue;
    lines.push(`## ${sev}（${items.length} 件）`);
    lines.push('');
    items.forEach(f => {
      lines.push(`### [${f.ruleId}] ${f.guidelineRef || ''}`);
      lines.push(`- 位置: ${f.location?.hint || '-'}`);
      lines.push(`- 内容: ${f.message}`);
      if (f.snippet) lines.push(`- 抜粋: 「${f.snippet}」`);
      if (f.suggestion) lines.push(`- 改善案: ${f.suggestion}`);
      // ルール固有フィールド（passive_phrase, original/concise, ambiguous_word 等）を一括展開
      if (f.extra && typeof f.extra === 'object') {
        for (const [k, v] of Object.entries(f.extra)) {
          const formatted = Array.isArray(v) ? v.join(' / ') : (typeof v === 'object' ? JSON.stringify(v) : String(v));
          lines.push(`- ${k}: ${formatted}`);
        }
      }
      if (f.implementationNote) lines.push(`- 補足: ${f.implementationNote}`);
      lines.push('');
    });
  }

  return lines.join('\n');
}
