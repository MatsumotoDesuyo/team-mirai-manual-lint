/**
 * report.gs — Doc 末尾にチェック結果を追記する。
 *
 * 重大度を ERROR / WARN / INFO で分離（DESIGN.md §7）。
 * 「人間確認 / 自動化対象外」は INFO で必ず出す（DESIGN.md §6）。
 *
 * 雛形段階では Doc 末尾追記のみ。将来サイドバー化や JSON 添付を検討。
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

  body.appendParagraph('注意: 法令・著作権・肖像権・画像内容・改ページ後レイアウトは機械判定対象外です。校正チームによる目視確認が必須です。');

  var sections = [
    { key: 'ERROR', label: 'ERROR（決定論違反 / 要修正）' },
    { key: 'WARN',  label: 'WARN（LLM 助言 / 参考）' },
    { key: 'INFO',  label: 'INFO（人間確認領域）' }
  ];
  for (var s = 0; s < sections.length; s++) {
    var section = sections[s];
    var items = grouped[section.key];
    if (!items.length) continue;
    body.appendParagraph(section.label).setHeading(DocumentApp.ParagraphHeading.HEADING3);
    for (var k = 0; k < items.length; k++) {
      var item = items[k];
      var line = '[' + item.ruleId + '] ' + item.message;
      if (item.snippet) line += ' / 抜粋: 「' + item.snippet + '」';
      if (item.location && item.location.hint) line += ' / 位置: ' + item.location.hint;
      body.appendListItem(line);
    }
  }
};
