/**
 * handlers/meta.gs — フッターページ番号、作成日・更新日記載。
 * 担当ルール: A-META-001（雛形）/ A-META-002（本実装）
 */

this.checkFooterPageNumber = function(ctx, params, rule) {
  // フッター内の動的ページ番号要素は Advanced Docs Service 経由でないと確実に判別できない。
  // 次フェーズで本実装。
  return [tmLintTodoFinding_(rule, 'フッター右下に <currentPage>/<totalPages> 形式のページ番号があるか検査（Advanced Docs Service 必要）')];
};

this.checkCreatedUpdatedDate = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var paragraphs = ctx.walked.paragraphs;
  if (paragraphs.length === 0) return [];

  var n = params.scope_value || 10;
  var start = Math.max(0, paragraphs.length - n);

  var combined = '';
  for (var i = start; i < paragraphs.length; i++) {
    combined += paragraphs[i].text + '\n';
  }

  var patterns = params.patterns || [];
  for (var p = 0; p < patterns.length; p++) {
    var re;
    try {
      re = new RegExp(patterns[p]);
    } catch (e) {
      continue;
    }
    if (re.test(combined)) {
      return []; // どれか1つマッチで OK
    }
  }

  var preview = combined.replace(/\n+/g, ' / ').trim();
  return [tmLintMakeFinding_(rule, {
    location: { type: 'document', index: -1, hint: '本文末尾 ' + n + ' 段落' },
    snippet: tmLintTruncate(preview, 80),
    message: rule.message
  })];
};
