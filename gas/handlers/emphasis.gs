/**
 * handlers/emphasis.gs — 強調比率。
 * 担当ルール: A-EMPHASIS-001
 *
 * scope = "body_paragraphs" の場合、見出し系（headingType !== NORMAL）を除外し、本文段落のみで
 * 「装飾文字数 / 総文字数」を計算する。装飾の定義は params.emphasis_definition で:
 *   - "bold"             → run.effectiveBold === true
 *   - "highlight_b4f2e8" → run.background === "#b4f2e8"（raw、Run 個別の装飾のみ）
 */

this.checkEmphasisRatio = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var H = DocumentApp.ParagraphHeading;
  var maxRatio = (typeof params.max_ratio === 'number') ? params.max_ratio : 0.1;
  var definitions = params.emphasis_definition || ['bold', 'highlight_b4f2e8'];
  var scope = params.scope || 'body_paragraphs';

  var totalChars = 0;
  var emphasizedChars = 0;
  var emphasizedExamples = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (scope === 'body_paragraphs' && p.headingType && p.headingType !== H.NORMAL) continue;

    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text) continue;
      var len = run.text.replace(/\s/g, '').length;
      if (len === 0) continue;
      totalChars += len;

      var isEmphasis = false;
      for (var d = 0; d < definitions.length; d++) {
        var def = definitions[d];
        if (def === 'bold' && run.effectiveBold === true) {
          isEmphasis = true; break;
        }
        if (def === 'highlight_b4f2e8' && run.background &&
            run.background.toLowerCase() === '#b4f2e8') {
          isEmphasis = true; break;
        }
      }
      if (isEmphasis) {
        emphasizedChars += len;
        if (emphasizedExamples.length < 5) {
          emphasizedExamples.push({
            paragraphIndex: p.index,
            paragraphNum: i + 1,
            runNum: j + 1,
            start: run.start,
            end: run.end,
            text: run.text
          });
        }
      }
    }
  }

  if (totalChars === 0) return [];
  var ratio = emphasizedChars / totalChars;
  if (ratio <= maxRatio) return [];

  // 文書全体の集計違反として 1 件出す。位置は最初の強調例にジャンプさせる。
  var first = emphasizedExamples[0];
  var location, startOffset, endOffset, snippet;
  if (first) {
    location = { type: 'paragraph', index: first.paragraphIndex,
                 hint: '段落 ' + first.paragraphNum + '（強調例: 他 ' + (emphasizedExamples.length - 1) + ' 件以上）' };
    startOffset = first.start;
    endOffset = first.end;
    snippet = tmLintTruncate(first.text, 80);
  } else {
    location = { type: 'document', index: -1, hint: '文書全体' };
    startOffset = null;
    endOffset = null;
    snippet = '';
  }

  return [tmLintMakeFinding_(rule, {
    location: location,
    startOffset: startOffset,
    endOffset: endOffset,
    snippet: snippet,
    message: rule.message + '（実値: ' + (ratio * 100).toFixed(1) + '% = '
             + emphasizedChars + ' / ' + totalChars + ' 字）'
  })];
};
