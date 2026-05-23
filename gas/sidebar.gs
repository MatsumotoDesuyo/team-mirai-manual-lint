/**
 * sidebar.gs — チェック結果をサイドバー UI として表示する。
 *
 * loader.gs の tmLintRun から呼ばれる。サイドバー HTML はリモートから取得してテンプレ評価。
 * Doc 本文には触れない（[[feedback-no-doc-pollution]]）。
 *
 * 注意: サイドバーから google.script.run で呼ぶ関数は **バウンドスクリプト（loader.gs）に
 * 静的定義された関数** でなければならない。tmLintJumpTo は loader.gs 側に実装。
 * 本ファイルが提供する this.tmLintShowSidebar は loader.gs の tmLintRun から直接呼ぶ。
 */

this.tmLintShowSidebar = function(findings) {
  var htmlText = tmLintFetchSidebarHtml_();
  var template = HtmlService.createTemplate(htmlText);
  template.findings = findings;
  template.timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Tokyo',
    'yyyy-MM-dd HH:mm'
  );
  var output = template.evaluate()
    .setTitle('マニュアルチェック')
    .setWidth(360);
  DocumentApp.getUi().showSidebar(output);
};

function tmLintFetchSidebarHtml_() {
  var url = TM_LINT_CONFIG.rawBase + '/gas/sidebar.html?cb=' + Date.now();
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('サイドバー HTML 取得失敗: HTTP ' + code);
  }
  return res.getContentText('UTF-8');
}
