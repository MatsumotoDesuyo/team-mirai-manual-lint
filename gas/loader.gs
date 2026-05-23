/**
 * loader.gs — テンプレート Doc にバインドする側のスクリプト。
 *
 * 本ファイルは「コピーされる Doc」に含まれる唯一の永続コード。
 * 実行時に GitHub raw から最新のチェッカー一式と rules.json を取得し、eval で組み立てる。
 *
 * 設計根拠: DESIGN.md §4「テンプレート Doc コピー + リモートローダ」
 * - コピー後もロジック／ルール更新が中央から伝播 → ドリフト断
 * - Marketplace 不使用 → OAuth 検証不要・100ユーザーキャップなし
 *
 * 透明性確保（DESIGN.md §4 留意点）:
 * - 取得元 raw URL とコミット参照（main 固定ではなくタグ／SHA 推奨）をログ出力
 * - 監査可能性は公開リポジトリ側で担保
 */

var TM_LINT_CONFIG = {
  rawBase: 'https://raw.githubusercontent.com/MatsumotoDesuyo/team-mirai-manual-lint/main',
  ref: 'main',
  files: [
    'gas/lib/contrast.gs',
    'gas/lib/docwalk.gs',
    'gas/handlers/color.gs',
    'gas/handlers/font.gs',
    'gas/handlers/layout.gs',
    'gas/handlers/emphasis.gs',
    'gas/handlers/table.gs',
    'gas/handlers/chars.gs',
    'gas/handlers/meta.gs',
    'gas/handlers/link.gs',
    'gas/handlers/text.gs',
    'gas/report.gs',
    'gas/checker.gs'
  ],
  rulesPath: 'rules.json'
};

function onOpen() {
  DocumentApp.getUi()
    .createMenu('マニュアルチェック')
    .addItem('チェック実行', 'tmLintRun')
    .addItem('取得元の確認', 'tmLintShowSource')
    .addToUi();
}

function tmLintShowSource() {
  var msg = '取得元: ' + TM_LINT_CONFIG.rawBase + ' (ref=' + TM_LINT_CONFIG.ref + ')\n'
          + 'チェックを実行するたび、上記から最新のコードと rules.json を取得します。\n'
          + '公開リポジトリの内容を監査して問題ないことを確認したうえでご利用ください。';
  DocumentApp.getUi().alert(msg);
}

function tmLintRun() {
  var ui = DocumentApp.getUi();
  try {
    var sources = tmLintFetchAll_();
    var rules = JSON.parse(sources.rulesText);

    // 取得した .gs を順に eval してグローバルに関数を載せる。
    // GAS V8 ランタイムの eval スコープはグローバルではないため、
    // 関数定義は (this.xxx = function(...) {...}) 形式で明示展開する設計を採る。
    for (var i = 0; i < sources.codes.length; i++) {
      eval(sources.codes[i]);
    }

    // checker.gs が定義する tmLintExecuteChecks をディスパッチャとして呼ぶ。
    var doc = DocumentApp.getActiveDocument();
    var findings = tmLintExecuteChecks(doc, rules);
    tmLintRenderReport(doc, findings, { rulesVersion: rules.version, ref: TM_LINT_CONFIG.ref });

    ui.alert('チェック完了: ' + findings.length + ' 件の指摘を末尾レポートに出力しました。');
  } catch (e) {
    ui.alert('エラー: ' + e.message + '\n\n' + (e.stack || ''));
  }
}

function tmLintFetchAll_() {
  var codes = [];
  for (var i = 0; i < TM_LINT_CONFIG.files.length; i++) {
    codes.push(tmLintFetchText_(TM_LINT_CONFIG.rawBase + '/' + TM_LINT_CONFIG.files[i]));
  }
  var rulesText = tmLintFetchText_(TM_LINT_CONFIG.rawBase + '/' + TM_LINT_CONFIG.rulesPath);
  return { codes: codes, rulesText: rulesText };
}

function tmLintFetchText_(url) {
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error('取得失敗: ' + url + ' (HTTP ' + code + ')');
  }
  return res.getContentText('UTF-8');
}
