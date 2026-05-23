/**
 * report.gs — Doc 末尾にチェック結果を追記する。
 *
 * 重大度を ERROR / WARN / INFO で分離（DESIGN.md §7）。
 * 「人間確認 / 自動化対象外」は INFO で必ず出す（DESIGN.md §6）。
 *
 * 出力フォーマット（1 Finding につき複数段落）:
 *   [A-COLOR-002] §2 配色 / ミントグリーン #64d8c6 文字色不使用
 *     内容: 本文文字色にチームみらいミントグリーン（#64d8c6）が使用されています。…
 *     位置: 段落 12（または 未実装（雛形））
 *     抜粋: 「該当テキスト…」
 *     実装方針: 禁色 #64d8c6 検出のため Run 走査    ← 雛形時のみ
 */

this.tmLintRenderReport = function(doc, findings, meta) {
  var body = doc.getBody();
  body.appendHorizontalRule();
  body.appendParagraph('— マニュアルチェック結果 —').setHeading(DocumentApp.ParagraphHeading.HEADING2);

  var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  body.appendParagraph('実行日時: ' + now);
  body.appendParagraph('rules.json バージョン: ' + (meta.rulesVersion || 'unknown'));
  body.appendParagraph('チェッカー参照: ' + (meta.ref || 'unknown'));

  var grouped = { ERROR: [], WARN: [], INFO: [] };
  for (var i = 0; i < findings.length; i++) {
    var f = findings[i];
    (grouped[f.severity] || grouped.INFO).push(f);
  }

  body.appendParagraph('集計: ERROR=' + grouped.ERROR.length
    + ' / WARN=' + grouped.WARN.length
    + ' / INFO=' + grouped.INFO.length);

  // 雛形時の注記: 全 Finding が implementationNote を持つ場合は「全ハンドラ未実装」状態と判断。
  var todoCount = 0;
  for (var t = 0; t < findings.length; t++) {
    if (findings[t].implementationNote) todoCount++;
  }
  if (findings.length > 0 && todoCount === findings.length) {
    var notice = body.appendParagraph(
      '【現在は雛形段階】全ハンドラが未実装です。各 Finding は「該当ルールが配管されている」確認用で、'
      + '位置・抜粋・実値は本実装後に表示されます。判定意図はルール ID 横のガイドライン参照を参照してください。'
    );
    notice.editAsText().setBold(true);
  }

  body.appendParagraph('注意: 法令・著作権・肖像権・画像内容・改ページ後レイアウトは機械判定対象外です。校正チームによる目視確認が必須です。');

  var sections = [
    { key: 'ERROR', label: 'ERROR（決定論違反 / 要修正）' },
    { key: 'WARN',  label: 'WARN（LLM 助言 / 参考）' },
    { key: 'INFO',  label: 'INFO（人間確認領域 / 雛形未実装）' }
  ];
  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];
    var items = grouped[section.key];
    if (!items.length) continue;
    body.appendParagraph(section.label).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    for (var k = 0; k < items.length; k++) {
      tmLintAppendFinding_(body, items[k]);
    }
  }
};

function tmLintAppendFinding_(body, f) {
  // ヘッダ行: [ID] ガイドライン参照（太字）
  var headerText = '[' + f.ruleId + '] ' + (f.guidelineRef || '(ガイドライン参照なし)');
  var header = body.appendParagraph(headerText);
  header.editAsText().setBold(true);

  // 内容行: ガイドライン違反の説明（rules.json の message）
  if (f.message) {
    body.appendParagraph('  内容: ' + f.message);
  }

  // 位置情報
  var locStr = tmLintFormatLocation_(f.location);
  body.appendParagraph('  位置: ' + locStr);

  // 抜粋
  if (f.snippet) {
    body.appendParagraph('  抜粋: 「' + f.snippet + '」');
  }

  // 実装方針（雛形時のみ）
  if (f.implementationNote) {
    body.appendParagraph('  実装方針: ' + f.implementationNote);
  }
}

function tmLintFormatLocation_(loc) {
  if (!loc) return '(位置情報なし)';
  if (loc.hint) return loc.hint;
  if (loc.type === 'paragraph' && typeof loc.index === 'number' && loc.index >= 0) {
    return '段落 ' + (loc.index + 1);
  }
  if (loc.type === 'run' && typeof loc.index === 'number' && loc.index >= 0) {
    return 'Run ' + (loc.index + 1);
  }
  if (loc.type === 'table_cell') {
    return '表セル' + (loc.hint ? ' (' + loc.hint + ')' : '');
  }
  if (loc.type === 'footer') return 'フッター';
  return '(位置情報なし)';
}
