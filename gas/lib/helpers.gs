/**
 * lib/helpers.gs — handler 共通ヘルパー。
 *
 * loader.gs の TM_LINT_CONFIG.files 配列で handler より先に読み込まれる前提
 * （this.xxx 形式でグローバルに展開）。
 */

// 雛形時の TODO Finding 生成（本実装が進むと縮退・削除可能）。
this.tmLintTodoFinding_ = function(rule, implementationNote) {
  return {
    ruleId: rule.id,
    severity: 'INFO',
    guidelineRef: rule.guideline_ref || '',
    location: { type: 'document', index: -1, hint: '未実装（雛形）' },
    snippet: '',
    message: rule.message || '',
    implementationNote: implementationNote || '',
    autoFixable: false
  };
};

this.tmLintTruncate = function(s, max) {
  if (s == null) return '';
  s = String(s);
  if (s.length <= max) return s;
  return s.substring(0, max) + '…';
};

this.tmLintAlignmentName = function(a) {
  if (!DocumentApp || !DocumentApp.HorizontalAlignment) return String(a);
  var H = DocumentApp.HorizontalAlignment;
  if (a === H.LEFT) return 'LEFT';
  if (a === H.CENTER) return 'CENTER';
  if (a === H.RIGHT) return 'RIGHT';
  if (a === H.JUSTIFY) return 'JUSTIFY';
  return String(a);
};

// 段落単位の汎用 Finding 構築。各 handler の繰り返しを減らすため。
this.tmLintMakeFinding_ = function(rule, opts) {
  return {
    ruleId: rule.id,
    severity: opts.severity || rule.severity || 'ERROR',
    guidelineRef: rule.guideline_ref || '',
    location: opts.location || { type: 'document', index: -1 },
    snippet: opts.snippet || '',
    message: opts.message || rule.message || '',
    implementationNote: opts.implementationNote || '',
    autoFixable: opts.autoFixable === true
  };
};

// cm → pt 換算（1in = 2.54cm = 72pt → 1cm ≒ 28.3464567pt）。
this.tmLintCmToPt = function(cm) {
  return cm * 28.3464567;
};
