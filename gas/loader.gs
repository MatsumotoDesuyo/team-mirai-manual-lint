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
 *
 * サイドバー UI:
 * - チェック実行時、Doc 末尾レポートに加えてサイドバーを開き Finding 一覧を表示
 * - サイドバーから google.script.run.tmLintJumpTo() を呼ぶ。tmLintJumpTo はサーバ側で
 *   静的関数として参照される必要があるため、本ファイル（バウンドスクリプト）に直接定義
 */

var TM_LINT_CONFIG = {
  rawBase: 'https://raw.githubusercontent.com/MatsumotoDesuyo/team-mirai-manual-lint/main',
  ref: 'main',
  // options.writeDocReport: 末尾レポートを Doc 本文に書き込むか。
  //   既定 false。サイドバー UI で結果は見られるため、本文書き込みは「Doc 汚し」になる。
  //   どうしても本文に残したい場合のみ true に変更してから再貼り付け。
  options: {
    writeDocReport: false
  },
  files: [
    'gas/lib/helpers.gs',
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

    // 既定では末尾レポートを書き込まない（[[feedback-no-doc-pollution]]）。
    // 必要なら TM_LINT_CONFIG.options.writeDocReport = true で有効化。
    if (TM_LINT_CONFIG.options && TM_LINT_CONFIG.options.writeDocReport) {
      tmLintRenderReport(doc, findings, { rulesVersion: rules.version, ref: TM_LINT_CONFIG.ref });
    }

    // サイドバー UI を表示（クリックで該当箇所にジャンプ）。
    var sha = tmLintFetchCommitSha_();
    tmLintShowSidebar_(findings, {
      sha: sha,
      docId: doc.getId(),
      rulesVersion: rules.version,
      ref: TM_LINT_CONFIG.ref
    });
  } catch (e) {
    ui.alert('エラー: ' + e.message + '\n\n' + (e.stack || ''));
  }
}

function tmLintFetchAll_() {
  var codes = [];
  for (var i = 0; i < TM_LINT_CONFIG.files.length; i++) {
    var url = TM_LINT_CONFIG.rawBase + '/' + TM_LINT_CONFIG.files[i] + '?cb=' + Date.now();
    codes.push(tmLintFetchText_(url));
  }
  var rulesUrl = TM_LINT_CONFIG.rawBase + '/' + TM_LINT_CONFIG.rulesPath + '?cb=' + Date.now();
  var rulesText = tmLintFetchText_(rulesUrl);
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

/**
 * Advanced Docs Service のスコープを Apps Script 静的解析に認識させるためのダミー関数。
 * 実行されない。リモート (docwalk.gs) で `Docs.Documents.get(...)` を呼ぶが、
 * リモート eval ロードのコードは静的解析対象外でスコープが要求されないため、本ファイルに
 * 静的呼び出しを残しておく必要がある（サイドバーで踏んだ罠と同じ）。
 *
 * 利用条件: Apps Script エディタで「サービス → Google Docs API」を有効化していること。
 * 未有効化の場合は docwalk.gs 側で typeof チェックして無効化扱いに落とす。
 */
function _tmLintAdvancedDocsScopeHint_() {
  if (false) {
    Docs.Documents.get('dummy-doc-id');
  }
}

/**
 * サイドバーを表示する。
 *
 * 静的に loader.gs に置く理由:
 * Apps Script は loader.gs に静的に書かれた GAS API 呼び出しを解析して必要 OAuth スコープを
 * 自動推測する。`DocumentApp.getUi().showSidebar(...)` には `script.container.ui` スコープが
 * 必要だが、これをリモート（eval ロード）に置くと静的解析がスコープを要求してくれず、
 * 「指定された権限では Ui.showSidebar を呼び出すことができません」エラーで死ぬ。
 *
 * HTML テンプレート本体は gas/sidebar.html としてリモート配信し、ロジック側だけバウンド。
 */
function tmLintShowSidebar_(findings, meta) {
  meta = meta || {};
  var htmlUrl = TM_LINT_CONFIG.rawBase + '/gas/sidebar.html?cb=' + Date.now();
  var htmlText = tmLintFetchText_(htmlUrl);

  var template = HtmlService.createTemplate(htmlText);
  template.findings = findings;
  template.timestamp = Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone() || 'Asia/Tokyo',
    'yyyy-MM-dd HH:mm'
  );
  template.sha = meta.sha || '';
  template.docId = meta.docId || '';
  template.rulesVersion = meta.rulesVersion || '';
  template.ref = meta.ref || '';
  var output = template.evaluate()
    .setTitle('マニュアルチェック')
    .setWidth(360);
  DocumentApp.getUi().showSidebar(output);
}

/**
 * 現在の ref（main 既定）の最新コミット SHA を GitHub API から取得。
 * 取得できなかった場合は空文字を返す（サイドバー UI 側でフォールバック表示）。
 * 未認証で 60 req/h 制限あり。実行ごとに 1 回呼ぶ程度なら通常範囲内。
 */
function tmLintFetchCommitSha_() {
  try {
    var rawBase = TM_LINT_CONFIG.rawBase;
    // rawBase: https://raw.githubusercontent.com/<owner>/<repo>/<branch>
    var m = rawBase.match(/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)/);
    if (!m) return '';
    var apiUrl = 'https://api.github.com/repos/' + m[1] + '/' + m[2] + '/branches/' + m[3];
    var res = UrlFetchApp.fetch(apiUrl, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (res.getResponseCode() < 200 || res.getResponseCode() >= 300) return '';
    var data = JSON.parse(res.getContentText('UTF-8'));
    if (data && data.commit && data.commit.sha) {
      return data.commit.sha.substring(0, 7);
    }
  } catch (e) {}
  return '';
}

/**
 * サイドバーから google.script.run 経由で呼ばれるジャンプ関数。
 * google.script.run はバウンドスクリプトの **静的関数** しか呼べないので、リモートではなく
 * 本ファイルに置く。
 *
 * paragraphIndex: ctx.walked.paragraphs[i].index（Body.getChild の index）
 * startOffset / endOffset: 段落内の文字オフセット（半開区間）。null なら段落全体を選択
 */
function tmLintJumpTo(paragraphIndex, startOffset, endOffset) {
  try {
    var doc = DocumentApp.getActiveDocument();
    var body = doc.getBody();
    if (paragraphIndex == null || paragraphIndex < 0 || paragraphIndex >= body.getNumChildren()) {
      return { ok: false, error: 'paragraphIndex out of range: ' + paragraphIndex };
    }
    var element = body.getChild(paragraphIndex);
    var type = element.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH &&
        type !== DocumentApp.ElementType.LIST_ITEM) {
      return { ok: false, error: 'not paragraph/list_item: ' + type };
    }

    var rangeBuilder = doc.newRange();
    if (typeof startOffset === 'number' && typeof endOffset === 'number' && endOffset > startOffset) {
      var text = element.editAsText();
      var textLen = text.getText().length;
      if (textLen === 0) {
        rangeBuilder.addElement(element);
      } else {
        var safeStart = Math.max(0, Math.min(startOffset, textLen - 1));
        var safeEndInclusive = Math.max(safeStart, Math.min(endOffset - 1, textLen - 1));
        rangeBuilder.addElement(text, safeStart, safeEndInclusive);
      }
    } else {
      rangeBuilder.addElement(element);
    }
    doc.setSelection(rangeBuilder.build());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
