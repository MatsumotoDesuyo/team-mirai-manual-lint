/**
 * handlers/chars.gs — 絵文字・機種依存文字。
 * 担当ルール: A-CHARS-001
 */

this.checkForbiddenChars = function(ctx, params, rule) {
  // TODO: 全 Run のテキストを NFC 正規化したうえで、
  //   - params.forbidden_unicode_categories（Emoji 系）をコードポイント範囲で検出
  //   - params.forbidden_codepoints（丸数字 ①-⑳ 等）を検出
  //   - params.allowed_symbols は除外
  //  サロゲートペアを正しく扱うため、for...of でコードポイント反復する。
  //
  // 検出には Unicode プロパティ照合が必要だが、GAS の RegExp は \p{Emoji} を限定的にサポート。
  // 主要範囲をハードコード（U+1F300-1F9FF 等）するか、判定用の固定 RegExp を rules.json から渡す設計を検討。
  return [tmLintTodoFinding_(rule, 'Emoji 系 Unicode 範囲と丸数字を Run 単位で検出（allowed_symbols 除外）')];
};
