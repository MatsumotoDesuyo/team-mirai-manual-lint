/**
 * handlers/text.gs — 文章の決定論的チェック。
 * 担当ルール: A-TEXT-001（読点 1 文 3 つまで）/ A-TEXT-002（漢字連続 6 字以下）
 *
 * 各 Finding は段落内の startOffset/endOffset を持ち、サイドバー UI でクリック時に
 * 該当範囲を選択状態にできる。
 */

this.checkMaxCommasPerSentence = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var max = params.max_commas;
  var paragraphs = ctx.walked.paragraphs;
  var H = DocumentApp.ParagraphHeading;
  var findings = [];

  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    // 本文段落のみ。見出し系・タイトルは除外。
    if (p.headingType && p.headingType !== H.NORMAL) continue;
    var text = p.text;
    if (!text) continue;

    var sentences = tmLintSplitSentences_(text);
    for (var k = 0; k < sentences.length; k++) {
      var sentence = sentences[k];
      if (!sentence.text.trim()) continue;
      var commaCount = (sentence.text.match(/、/g) || []).length;
      if (commaCount <= max) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'paragraph', index: p.index, hint: '段落 ' + (i + 1) + ' / 第 ' + (k + 1) + ' 文' },
        startOffset: sentence.start,
        endOffset: sentence.end,
        snippet: tmLintTruncate(sentence.text, 80),
        message: rule.message + '（実値: ' + commaCount + ' 個）'
      }));
    }
  }
  return findings;
};

this.checkMaxKanjiRun = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var max = params.max_run;
  var paragraphs = ctx.walked.paragraphs;
  var H = DocumentApp.ParagraphHeading;
  // CJK 漢字: CJK Unified Ideographs (基本) + Extension A + 互換漢字
  var kanjiSrc = '[\\u4E00-\\u9FFF\\u3400-\\u4DBF\\uF900-\\uFAFF]+';
  var findings = [];

  for (var i = 0; i < paragraphs.length; i++) {
    var p = paragraphs[i];
    if (p.headingType && p.headingType !== H.NORMAL) continue;
    var text = p.text;
    if (!text) continue;

    var re = new RegExp(kanjiSrc, 'g');
    var match;
    while ((match = re.exec(text)) !== null) {
      var run = match[0];
      if (run.length <= max) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'paragraph', index: p.index, hint: '段落 ' + (i + 1) + ' / 位置 ' + (match.index + 1) },
        startOffset: match.index,
        endOffset: match.index + run.length,
        snippet: tmLintTruncate('…' + run + '…', 80),
        message: rule.message + '（実値: ' + run.length + ' 字「' + run + '」）'
      }));
    }
  }
  return findings;
};

// 句点・感嘆符・疑問符・改行で文を区切る。区切り文字自体は前の文に含める。
// 戻り値の各要素は { text, start, end } で、start/end は段落内の文字オフセット（半開区間）。
function tmLintSplitSentences_(text) {
  var result = [];
  var current = '';
  var startOffset = 0;
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    current += ch;
    if (ch === '。' || ch === '！' || ch === '？' || ch === '\n') {
      result.push({ text: current, start: startOffset, end: i + 1 });
      current = '';
      startOffset = i + 1;
    }
  }
  if (current.length > 0) {
    result.push({ text: current, start: startOffset, end: text.length });
  }
  return result;
}
