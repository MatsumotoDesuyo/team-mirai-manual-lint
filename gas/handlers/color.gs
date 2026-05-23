/**
 * handlers/color.gs — 文字色・背景色・コントラスト関連。
 * 担当ルール: A-COLOR-001 / A-COLOR-002 / A-COLOR-003 / A-COLOR-004
 *
 * 雛形: 各関数は TODO Finding を 1 件返すスケルトン。
 *   ctx は checker.gs の tmLintBuildContext_ の戻り値。
 *   params は rules.json の各 rule.params。
 */

this.checkDefaultTextColor = function(ctx, params, rule) {
  // TODO: ctx.walked.paragraphs[*].runs[*].effectiveForeground を全件走査し、
  //  params.default_color と完全一致しない Run を Finding 化。
  //  exempt_contexts: ["link", "table_header_row"] の Run は除外。
  return [tmLintTodoFinding_(rule, '本実装で ctx.walked.paragraphs を走査')];
};

this.checkForbiddenTextColor = function(ctx, params, rule) {
  // TODO: forbidden_colors に含まれる色（許容差 common.tolerance.color_hex を考慮）を検出。
  return [tmLintTodoFinding_(rule, '禁色 #64d8c6 検出のため Run 走査')];
};

this.checkAllowedHighlightColor = function(ctx, params, rule) {
  // TODO: Run の background が null または allowed_highlights 以外を Finding 化。
  return [tmLintTodoFinding_(rule, '強調背景色（許可: null, #b4f2e8）検査')];
};

this.checkContrast = function(ctx, params, rule) {
  // TODO: 各 Run について
  //  - fg = effectiveForeground or "#000000"
  //  - bg = effectiveBackground or 親（テーブルセル等）の bg or "#ffffff"
  //  - ratio = tmLintContrastRatio(fg, bg)
  //  - 閾値は size_pt >= large_size_pt or (size_pt >= large_bold_size_pt && bold) なら large、それ以外 normal
  //  rules.common.wcag を参照する設計。
  return [tmLintTodoFinding_(rule, 'lib/contrast.gs の tmLintContrastRatio を使用')];
};

function tmLintTodoFinding_(rule, hint) {
  return {
    ruleId: rule.id,
    severity: 'INFO',
    location: { type: 'document', index: -1, hint: 'TODO' },
    snippet: '',
    message: '[TODO 雛形] ' + rule.id + ' は未実装。実装方針: ' + hint,
    autoFixable: false
  };
}
