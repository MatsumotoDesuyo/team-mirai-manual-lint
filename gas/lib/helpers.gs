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
// startOffset/endOffset は段落内の文字オフセット（半開区間 [start, end)）。サイドバー UI から
// google.script.run.tmLintJumpTo() で Range を構築するときに使う。
this.tmLintMakeFinding_ = function(rule, opts) {
  return {
    ruleId: rule.id,
    severity: opts.severity || rule.severity || 'ERROR',
    guidelineRef: rule.guideline_ref || '',
    location: opts.location || { type: 'document', index: -1 },
    startOffset: (typeof opts.startOffset === 'number') ? opts.startOffset : null,
    endOffset: (typeof opts.endOffset === 'number') ? opts.endOffset : null,
    snippet: opts.snippet || '',
    message: opts.message || rule.message || '',
    implementationNote: opts.implementationNote || '',
    autoFixable: (typeof opts.autoFixable === 'boolean') ? opts.autoFixable : (rule.autoFixable === true),
    autoFix: rule.autoFix || null
  };
};

// finding.location.index から段落（Paragraph or ListItem）要素を取得するヘルパー。
// fix 関数群が共通で使う。見つからない / 型不一致なら null を返す。
this.tmLintGetParagraphFromFinding_ = function(doc, finding) {
  var body = doc.getBody();
  var idx = (finding && finding.location && typeof finding.location.index === 'number')
    ? finding.location.index : -1;
  if (idx < 0 || idx >= body.getNumChildren()) return null;
  var element = body.getChild(idx);
  var type = element.getType();
  if (type !== DocumentApp.ElementType.PARAGRAPH &&
      type !== DocumentApp.ElementType.LIST_ITEM) return null;
  return (type === DocumentApp.ElementType.PARAGRAPH) ? element.asParagraph() : element.asListItem();
};

// finding.location.index から Table 要素を取得するヘルパー。
this.tmLintGetTableFromFinding_ = function(doc, finding) {
  var body = doc.getBody();
  var idx = (finding && finding.location && typeof finding.location.index === 'number')
    ? finding.location.index : -1;
  if (idx < 0 || idx >= body.getNumChildren()) return null;
  var element = body.getChild(idx);
  if (element.getType() !== DocumentApp.ElementType.TABLE) return null;
  return element.asTable();
};

// 段落内の startOffset / endOffset から、setXxx(start, endInclusive, value) 用の範囲を作る。
// 戻り値: { start, endInclusive } または null（テキストなしなど）
this.tmLintResolveRunRange_ = function(text, finding) {
  var textLen = text.getText().length;
  if (textLen === 0) return null;
  var start = (typeof finding.startOffset === 'number') ? finding.startOffset : 0;
  var end = (typeof finding.endOffset === 'number') ? finding.endOffset : textLen;
  if (end > textLen) end = textLen;
  if (end <= start) return null;
  var safeStart = Math.max(0, Math.min(start, textLen - 1));
  var safeEndInclusive = Math.max(safeStart, Math.min(end - 1, textLen - 1));
  return { start: safeStart, endInclusive: safeEndInclusive };
};

// cm → pt 換算（1in = 2.54cm = 72pt → 1cm ≒ 28.3464567pt）。
this.tmLintCmToPt = function(cm) {
  return cm * 28.3464567;
};
