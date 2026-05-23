/**
 * handlers/font.gs — フォントファミリ・サイズ階層関連。
 * 担当ルール: A-FONT-001 / A-FONT-002〜006 (checkHeadingStyle) / A-FONT-007
 */

this.checkFontFamily = function(ctx, params, rule) {
  // TODO: 全 Run の effectiveFontFamily が params.allowed_fonts に含まれない場合 Finding。
  //  バリアント表記（"Noto Sans Japanese" 等）の正規化を要検討。
  return [tmLintTodoFinding_(rule, 'allowed_fonts 以外のフォントを Run 単位で検出')];
};

this.checkHeadingStyle = function(ctx, params, rule) {
  // TODO: ctx.walked.paragraphs を走査し、headingType === params.heading_type の段落について
  //   - effectiveFontSize === params.size_pt
  //   - effectiveBold === params.bold
  //   を検査。NORMAL かつ allow_bold_for_emphasis: true の場合は Bold は許容（強調比率は別ルール）。
  return [tmLintTodoFinding_(rule, params.heading_type + ' に size_pt=' + params.size_pt + '/bold=' + params.bold + ' を期待')];
};

this.checkMinFontSize = function(ctx, params, rule) {
  // TODO: 全 Run の effectiveFontSize < params.min_size_pt を検出。
  //  exempt_contexts: ["quote_block"] は除外（GAS には引用ブロック型がないため、
  //  インデント or namedStyle.name === "Quote" 等の推定で対応）。
  return [tmLintTodoFinding_(rule, params.min_size_pt + 'pt 未満を検出（引用例外）')];
};
