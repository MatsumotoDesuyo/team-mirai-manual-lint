/**
 * handlers/meta.gs — フッターページ番号、作成日・更新日記載。
 * 担当ルール: A-META-001 / A-META-002
 */

this.checkFooterPageNumber = function(ctx, params, rule) {
  // TODO:
  //  - ctx.footer が null なら ERROR Finding（フッター自体なし）
  //  - フッター内の段落 alignment が RIGHT か検査
  //  - フッターテキストが params.pattern (正規表現) にマッチするか
  //  - require_dynamic: true の場合、Advanced Docs Service で
  //    contentRefs / autoTextStyle 等の動的ページ番号要素を確認
  return [tmLintTodoFinding_(rule, 'フッター右下に <currentPage>/<totalPages> 形式のページ番号があるか検査')];
};

this.checkCreatedUpdatedDate = function(ctx, params, rule) {
  // TODO: ctx.walked.paragraphs の末尾 scope_value 段落のテキストを連結し、
  //  params.patterns の各正規表現でいずれかにマッチするかを判定。
  //  「作成日」「更新日」両方の検出を要求するか片方で可とするかは仕様要確認 → 雛形では片方で可とする。
  return [tmLintTodoFinding_(rule, '末尾 ' + (params.scope_value || 10) + ' 段落で作成日/更新日記載を検索')];
};
