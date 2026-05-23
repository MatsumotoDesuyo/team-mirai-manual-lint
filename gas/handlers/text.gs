/**
 * handlers/text.gs — 文章の決定論的チェック。
 * 担当ルール: A-TEXT-001（読点 1 文 3 つまで）/ A-TEXT-002（漢字連続 6 字以下）
 *
 * 「わかりやすさ」§3 の多くは Layer B（LLM）の責務だが、機械的にカウントで決着がつくものは
 * 本ファイルで Layer A として扱う。
 */

this.checkMaxCommasPerSentence = function(ctx, params, rule) {
  // TODO:
  //  - ctx.walked.paragraphs を本文段落（NORMAL）に絞り、段落テキストを連結
  //  - 「。」「！」「？」改行（\n）で文に分割
  //  - 各文に含まれる「、」を数え、> params.max_commas の文を Finding
  //  - exempt_contexts: 引用ブロック・法令節（見出し「法令」配下）を除外
  return [tmLintTodoFinding_(rule, '文を句点で分割し、読点数 > ' + params.max_commas + ' を検出')];
};

this.checkMaxKanjiRun = function(ctx, params, rule) {
  // TODO:
  //  - 全本文 Run のテキストを連結
  //  - CJK 漢字（一-鿿, 㐀-䶿, 豈-﫿）の連続部分文字列を抽出
  //  - 長さ > params.max_run の部分を Finding
  //  - exempt_proper_nouns: true の場合、用語集スプレッドシートの固有名詞辞書とつき合わせて除外
  //    （雛形では辞書ロード未実装。Layer B 着手時に併せて整備）
  return [tmLintTodoFinding_(rule, '漢字連続 > ' + params.max_run + ' 字を検出（固有名詞除外は将来）')];
};
