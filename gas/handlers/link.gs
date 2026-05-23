/**
 * handlers/link.gs — リンク抽出と URL 形式検査。
 * 担当ルール: A-LINK-001 / A-LINK-002
 *
 * 到達性検査（OUT-LINK-001）は本ファイルでは扱わない（DESIGN.md §6 / rules-matrix.md 参照）。
 */

this.extractAndValidateLinks = function(ctx, params, rule) {
  // TODO:
  //  - ctx.walked.paragraphs[*].runs[*].linkUrl が non-null のものを収集
  //  - scope === "reference_section" の場合、見出し「参考URL」「参考」以降の段落に限定
  //  - 各 URL を params.url_pattern (正規表現) でテストし、不適合を Finding 化
  //  - 抜粋にはリンクテキスト先頭 30 字程度を入れる
  return [tmLintTodoFinding_(rule, 'scope=' + params.scope + ' で linkUrl を抽出し ' + params.url_pattern + ' で検証')];
};
