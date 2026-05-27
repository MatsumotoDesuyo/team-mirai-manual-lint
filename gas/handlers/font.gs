/**
 * handlers/font.gs — フォントファミリ・サイズ階層関連。
 * 担当ルール: A-FONT-001（本実装） / A-FONT-002〜006 (checkHeadingStyle 本実装) / A-FONT-007（本実装）
 *
 * docwalk.gs が namedStyles 継承解決を行うため、各 Run の effectiveXxx を使う。
 * Advanced Docs Service が未有効化の場合、ctx.walked.namedStylesAvailable === false となり
 * その旨を案内する Finding を返す。
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
      var effective = run.effectiveFontFamily;
      if (effective === null) continue; // 継承解決でも null（Advanced 未有効 + Run 未設定）なら判定保留
      if (allowed.indexOf(effective) !== -1) continue;
      if (!run.text || !run.text.trim()) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + effective + '）'
      }));
    }
  }
  return findings;
};

this.checkHeadingStyle = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  if (!ctx.walked.namedStylesAvailable) {
    return [tmLintTodoFinding_(rule,
      'Advanced Docs Service が無効。Apps Script エディタで「サービス → Google Docs API」を追加してください')];
  }

  var targetKey = params.heading_type; // "TITLE", "HEADING1", ..., "NORMAL"
  var expectedSize = params.size_pt;
  var expectedBold = params.bold;
  var allowBoldForEmphasis = params.allow_bold_for_emphasis === true;

  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (p.headingKey !== targetKey) continue;
    if (!p.text || !p.text.trim()) continue;

    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text || !run.text.trim()) continue;

      var sizeOk = (run.effectiveFontSize === expectedSize);
      var boldOk;
      if (allowBoldForEmphasis && expectedBold === false) {
        // 本文 (NORMAL) では bold=true でも装飾扱いなので別ルール (A-EMPHASIS-001) に委ねる
        boldOk = true;
      } else {
        boldOk = (run.effectiveBold === expectedBold);
      }
      if (sizeOk && boldOk) continue;

      var actualParts = [];
      actualParts.push('size=' + (run.effectiveFontSize !== null ? run.effectiveFontSize.toFixed(1) + 'pt' : '?'));
      actualParts.push('bold=' + run.effectiveBold);

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + actualParts.join(', ') + ' / 期待: ' + expectedSize + 'pt, bold=' + expectedBold + '）'
      }));
    }
  }
  return findings;
};

// ============================================================
// autoFix 関数群（サイドバー UI の「⚡ 適用」ボタンから呼ばれる）
// ============================================================

this.fixFontFamily = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  var allowed = (params.allowed_fonts && params.allowed_fonts[0]) || 'Noto Sans JP';
  var text = para.editAsText();
  var range = tmLintResolveRunRange_(text, finding);
  if (!range) return { ok: false, error: 'テキスト範囲が空です' };
  text.setFontFamily(range.start, range.endInclusive, allowed);
  return { ok: true, message: 'フォントを ' + allowed + ' に設定しました' };
};

this.fixHeadingStyle = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  var text = para.editAsText();
  var range = tmLintResolveRunRange_(text, finding);
  if (!range) return { ok: false, error: 'テキスト範囲が空です' };
  text.setFontSize(range.start, range.endInclusive, params.size_pt);
  // 本文 (allow_bold_for_emphasis: true) では bold を強制しない（強調を残す）
  if (!params.allow_bold_for_emphasis) {
    text.setBold(range.start, range.endInclusive, params.bold === true);
  }
  var summary = params.size_pt + 'pt' + (params.bold && !params.allow_bold_for_emphasis ? ' 太字' : '');
  return { ok: true, message: params.heading_type + ' を ' + summary + ' に設定しました' };
};

this.fixMinFontSize = function(doc, finding, params) {
  var para = tmLintGetParagraphFromFinding_(doc, finding);
  if (!para) return { ok: false, error: '対象段落が見つかりません' };
  var text = para.editAsText();
  var range = tmLintResolveRunRange_(text, finding);
  if (!range) return { ok: false, error: 'テキスト範囲が空です' };
  text.setFontSize(range.start, range.endInclusive, params.min_size_pt || 11);
  return { ok: true, message: 'フォントサイズを ' + (params.min_size_pt || 11) + 'pt に設定しました' };
};

this.checkMinFontSize = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  if (!ctx.walked.namedStylesAvailable) {
    return [tmLintTodoFinding_(rule,
      'Advanced Docs Service が無効。Apps Script エディタで「サービス → Google Docs API」を追加してください')];
  }

  var minSize = params.min_size_pt;
  // exempt_contexts: ["quote_block"] は雛形では未対応。本実装後に拡張。
  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (run.effectiveFontSize === null) continue;
      if (run.effectiveFontSize >= minSize) continue;
      if (!run.text || !run.text.trim()) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + run.effectiveFontSize.toFixed(1) + 'pt）'
      }));
    }
  }
  return findings;
};
