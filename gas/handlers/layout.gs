/**
 * handlers/layout.gs — 余白・配置・行間・字下げ。
 * 担当ルール: A-LAYOUT-001 / A-LAYOUT-002 / A-LAYOUT-003 / A-LAYOUT-004
 */

this.checkMargins = function(ctx, params, rule) {
  var body = ctx.body;
  var expectedPt = tmLintCmToPt(params.margin_cm);
  var tolerance = 1; // common.tolerance.margin_pt 相当（ハードコード）

  var sides = [
    { name: '上', value: tmLintSafeBodyAttr_(body, 'getMarginTop') },
    { name: '下', value: tmLintSafeBodyAttr_(body, 'getMarginBottom') },
    { name: '左', value: tmLintSafeBodyAttr_(body, 'getMarginLeft') },
    { name: '右', value: tmLintSafeBodyAttr_(body, 'getMarginRight') }
  ];

  var findings = [];
  for (var i = 0; i < sides.length; i++) {
    var s = sides[i];
    if (s.value === null) continue;
    if (Math.abs(s.value - expectedPt) > tolerance) {
      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'page_setup', index: -1, hint: 'ページ設定 / ' + s.name + '余白' },
        snippet: '実値: ' + s.value.toFixed(1) + 'pt（期待: ' + expectedPt.toFixed(1) + 'pt = ' + params.margin_cm + 'cm）',
        message: rule.message + '（' + s.name + '余白）'
      }));
    }
  }
  return findings;
};

this.checkLeftAlignment = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var LEFT = DocumentApp.HorizontalAlignment.LEFT;
  var findings = [];
  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (p.alignment === null) continue; // 未設定は LEFT 既定とみなす
    if (p.alignment === LEFT) continue;
    if (!p.text) continue; // 空段落はスキップ
    findings.push(tmLintMakeFinding_(rule, {
      location: { type: 'paragraph', index: p.index, hint: '段落 ' + (i + 1) },
      snippet: tmLintTruncate(p.text, 80),
      message: rule.message + '（実値: ' + tmLintAlignmentName(p.alignment) + '）'
    }));
  }
  return findings;
};

this.checkFirstLineIndent = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var expected = params.first_line_indent_pt || 0;
  var findings = [];
  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    // ListItem（箇条書き）のインデントはネスト深度由来であり、ガイドラインの「段落初めの字下げ」とは別概念。除外。
    if (p.isListItem) continue;
    var indent = p.firstLineIndent;
    if (indent === null) continue; // 未設定 = 0 既定
    if (Math.abs(indent - expected) <= 0.5) continue;
    if (!p.text) continue;
    findings.push(tmLintMakeFinding_(rule, {
      location: { type: 'paragraph', index: p.index, hint: '段落 ' + (i + 1) },
      snippet: tmLintTruncate(p.text, 80),
      message: rule.message + '（実値: ' + indent.toFixed(1) + 'pt）'
    }));
  }
  return findings;
};

this.checkLineSpacing = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var expected = params.line_spacing;
  var tolerance = 0.01;
  var findings = [];
  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (p.lineSpacing === null) continue;
    if (Math.abs(p.lineSpacing - expected) <= tolerance) continue;
    if (!p.text) continue;
    findings.push(tmLintMakeFinding_(rule, {
      location: { type: 'paragraph', index: p.index, hint: '段落 ' + (i + 1) },
      snippet: tmLintTruncate(p.text, 80),
      message: rule.message + '（実値: ' + p.lineSpacing.toFixed(3) + '）'
    }));
  }
  return findings;
};

function tmLintSafeBodyAttr_(body, methodName) {
  try { return body[methodName](); } catch (e) { return null; }
}

// ============================================================
// autoFix 関数群（サイドバー UI の「⚡ 適用」ボタンから呼ばれる）
// ============================================================

this.fixMargins = function(doc, finding, params) {
  var body = doc.getBody();
  var expectedPt = tmLintCmToPt(params.margin_cm);
  var hint = (finding.location && finding.location.hint) ? finding.location.hint : '';
  var sides = [];
  if (hint.indexOf('上余白') !== -1) { body.setMarginTop(expectedPt); sides.push('上'); }
  else if (hint.indexOf('下余白') !== -1) { body.setMarginBottom(expectedPt); sides.push('下'); }
  else if (hint.indexOf('左余白') !== -1) { body.setMarginLeft(expectedPt); sides.push('左'); }
  else if (hint.indexOf('右余白') !== -1) { body.setMarginRight(expectedPt); sides.push('右'); }
  else {
    body.setMarginTop(expectedPt);
    body.setMarginBottom(expectedPt);
    body.setMarginLeft(expectedPt);
    body.setMarginRight(expectedPt);
    sides.push('上下左右');
  }
  return { ok: true, message: sides.join('') + '余白を ' + params.margin_cm + 'cm に設定しました' };
};

this.fixLeftAlignment = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  para.setAlignment(DocumentApp.HorizontalAlignment.LEFT);
  return { ok: true, message: '段落を左揃えに設定しました' };
};

this.fixFirstLineIndent = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  para.setIndentFirstLine(params.first_line_indent_pt || 0);
  return { ok: true, message: '段落初め字下げを 0 に設定しました' };
};

this.fixLineSpacing = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  para.setLineSpacing(params.line_spacing || 1.15);
  return { ok: true, message: '行間を ' + (params.line_spacing || 1.15) + ' に設定しました' };
};
