/**
 * checker.gs — ディスパッチャ。
 * loader.gs から eval で取り込まれ、handler 群を順に呼ぶ。
 *
 * Finding 形式:
 *   {
 *     ruleId:            "A-COLOR-001",
 *     severity:          "ERROR" | "WARN" | "INFO",
 *     guidelineRef:      "§2 配色 / ミントグリーン #64d8c6 文字色不使用",   // ガイドラインの章節
 *     location:          { type: "paragraph"|"run"|"table_cell"|"footer", index: number, hint?: string },
 *     snippet:           "該当箇所の短い抜粋（最大80字）",
 *     message:           "人間向けメッセージ（ガイドライン違反の説明）",
 *     implementationNote: "雛形時のみ: 実装方針メモ。本実装後は空文字",
 *     autoFixable:       false
 *   }
 */

this.tmLintExecuteChecks = function(doc, rules) {
  var findings = [];
  var ctx = tmLintBuildContext_(doc);
  ctx.rules = rules;  // handler から ctx.rules.common.wcag 等を参照できるようにする

  for (var i = 0; i < rules.rules.length; i++) {
    var rule = rules.rules[i];
    var fn = this[rule.handler];
    if (typeof fn !== 'function') {
      findings.push({
        ruleId: rule.id,
        severity: 'INFO',
        guidelineRef: rule.guideline_ref || '',
        location: { type: 'document', index: -1, hint: 'ハンドラ未登録' },
        snippet: '',
        message: 'ハンドラ未実装: ' + rule.handler + '（rules.json に登録されているが gas/handlers/ に対応関数なし）',
        implementationNote: '',
        autoFixable: false
      });
      continue;
    }
    try {
      var result = fn(ctx, rule.params || {}, rule);
      if (Array.isArray(result)) {
        for (var j = 0; j < result.length; j++) {
          findings.push(tmLintNormalizeFinding_(result[j], rule));
        }
      }
    } catch (e) {
      findings.push({
        ruleId: rule.id,
        severity: 'INFO',
        guidelineRef: rule.guideline_ref || '',
        location: { type: 'document', index: -1, hint: 'ハンドラ実行時エラー' },
        snippet: '',
        message: 'ハンドラ実行時エラー: ' + e.message,
        implementationNote: '',
        autoFixable: false
      });
    }
  }
  return findings;
};

/**
 * Doc から後段で使い回すコンテキストを 1 度だけ構築する。
 * lib/docwalk.gs が提供するユーティリティで namedStyles 継承解決済みの
 * Paragraph / Run / Table 列を持たせる設計。
 */
function tmLintBuildContext_(doc) {
  return {
    doc: doc,
    body: doc.getBody(),
    footer: doc.getFooter ? doc.getFooter() : null,
    walked: (typeof tmLintWalkDoc === 'function') ? tmLintWalkDoc(doc) : null
  };
}

function tmLintNormalizeFinding_(f, rule) {
  return {
    ruleId: f.ruleId || rule.id,
    severity: f.severity || rule.severity || 'INFO',
    guidelineRef: f.guidelineRef || rule.guideline_ref || '',
    location: f.location || { type: 'document', index: -1 },
    startOffset: (typeof f.startOffset === 'number') ? f.startOffset : null,
    endOffset: (typeof f.endOffset === 'number') ? f.endOffset : null,
    snippet: f.snippet || '',
    message: f.message || rule.message || '',
    implementationNote: f.implementationNote || '',
    autoFixable: f.autoFixable === true
  };
}
