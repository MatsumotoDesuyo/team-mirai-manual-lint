/**
 * handlers/emphasis.gs — 強調比率。
 * 担当ルール: A-EMPHASIS-001
 */

this.checkEmphasisRatio = function(ctx, params, rule) {
  // TODO: scope === "body_paragraphs" の場合、見出し系（HeadingType !== NORMAL）を除外し、
  //  本文 Run の総文字数と「emphasis_definition に該当する Run」の文字数を集計。
  //  装飾文字数 / 総文字数 > max_ratio で Finding 化。
  //  emphasis_definition の例:
  //    - "bold" → effectiveBold === true
  //    - "highlight_b4f2e8" → effectiveBackground === "#b4f2e8"
  return [tmLintTodoFinding_(rule, '本文 Run のうち bold/highlight 装飾の文字比 > ' + params.max_ratio + ' を検出')];
};
