/**
 * handlers/layout.gs — 余白・配置・行間・字下げ。
 * 担当ルール: A-LAYOUT-001 / A-LAYOUT-002 / A-LAYOUT-003 / A-LAYOUT-004
 */

this.checkMargins = function(ctx, params, rule) {
  // TODO: ctx.body.getMarginTop / Bottom / Left / Right を取得（pt 単位）。
  //  cm 換算: 1cm = 28.3464567pt。params.margin_cm * 28.3464567 と比較し、
  //  common.tolerance.margin_pt 以内であれば適合。4 方向のうち外れたものだけ Finding 化。
  return [tmLintTodoFinding_(rule, 'body.getMarginTop/Bottom/Left/Right を pt で取得し 2cm と比較')];
};

this.checkLeftAlignment = function(ctx, params, rule) {
  // TODO: ctx.walked.paragraphs の effectiveAlignment が LEFT 以外を Finding 化。
  //  exempt_contexts: ["table_cell"] は表セル文脈で除外。
  return [tmLintTodoFinding_(rule, 'HorizontalAlignment.LEFT 以外を検出（表セル除外）')];
};

this.checkFirstLineIndent = function(ctx, params, rule) {
  // TODO: Paragraph.getIndentFirstLine() が 0 以外を Finding 化。null は未設定 = 0 とみなす。
  return [tmLintTodoFinding_(rule, 'getIndentFirstLine() != 0 を検出')];
};

this.checkLineSpacing = function(ctx, params, rule) {
  // TODO: Paragraph.getLineSpacing() と params.line_spacing を common.tolerance.line_spacing で比較。
  return [tmLintTodoFinding_(rule, 'getLineSpacing() != 1.15 ±tol を検出')];
};
