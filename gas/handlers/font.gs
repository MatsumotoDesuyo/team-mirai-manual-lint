/**
 * handlers/font.gs — フォントファミリ・サイズ階層関連。
 * 担当ルール: A-FONT-001（本実装）/ A-FONT-002〜006 (checkHeadingStyle 雛形) / A-FONT-007（雛形）
 *
 * 雛形のままのものは docwalk の namedStyles 継承解決完了後に本実装する予定。
 * 現在の docwalk は editAsText() ベースで Run 属性が null = 「未設定（継承）」として返るため、
 * 「見出しスタイル違反」の判定にはまだ早い（false positive が出やすい）。
 */

this.checkFontFamily = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var allowed = params.allowed_fonts || [];
  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (!p.runs || p.runs.length === 0) continue;

    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (run.fontFamily === null) continue; // 未設定（namedStyle 継承）は許容
      if (allowed.indexOf(run.fontFamily) !== -1) continue;
      if (!run.text || !run.text.trim()) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + run.fontFamily + '）'
      }));
    }
  }
  return findings;
};

this.checkHeadingStyle = function(ctx, params, rule) {
  // docwalk の namedStyles 継承解決完了後に本実装。
  return [tmLintTodoFinding_(rule, params.heading_type + ' に size_pt=' + params.size_pt + '/bold=' + params.bold + ' を期待（namedStyles 継承解決後に本実装）')];
};

this.checkMinFontSize = function(ctx, params, rule) {
  // 同上。getFontSize(offset) が null（継承）を返した場合の解決が必要。
  return [tmLintTodoFinding_(rule, params.min_size_pt + 'pt 未満を検出（引用例外、namedStyles 継承解決後に本実装）')];
};
