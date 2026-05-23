/**
 * handlers/link.gs — リンク抽出と URL 形式検査。
 * 担当ルール: A-LINK-001（scope=all） / A-LINK-002（scope=reference_section）
 *
 * 到達性検査（OUT-LINK-001）は本ファイルでは扱わない（DESIGN.md §6 / rules-matrix.md 参照）。
 */

this.extractAndValidateLinks = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var paragraphs = ctx.walked.paragraphs;

  var pattern;
  try {
    pattern = new RegExp(params.url_pattern);
  } catch (e) {
    return [tmLintMakeFinding_(rule, {
      severity: 'INFO',
      location: { type: 'document', index: -1, hint: 'rules.json' },
      snippet: '',
      message: 'url_pattern が不正な正規表現です: ' + params.url_pattern
    })];
  }

  var scanStart = 0;
  if (params.scope === 'reference_section') {
    var refIdx = tmLintFindReferenceSection_(paragraphs);
    if (refIdx === -1) return []; // 参考URL節がない → 検査対象なし
    scanStart = refIdx;
  }

  var findings = [];
  for (var i = scanStart; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.linkUrl) continue;
      if (pattern.test(run.linkUrl)) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text + ' → ' + run.linkUrl, 80),
        message: rule.message + '（不正 URL: ' + run.linkUrl + '）'
      }));
    }
  }
  return findings;
};

function tmLintFindReferenceSection_(paragraphs) {
  var H = DocumentApp.ParagraphHeading;
  var headingTypes = [H.HEADING1, H.HEADING2, H.HEADING3, H.HEADING4, H.HEADING5, H.HEADING6, H.TITLE];
  var refRe = /参考\s*URL|参考\s*資料|参考\s*リンク/;

  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    if (!p.text) continue;
    if (headingTypes.indexOf(p.headingType) === -1) continue;
    if (refRe.test(p.text)) return i;
  }
  return -1;
}
