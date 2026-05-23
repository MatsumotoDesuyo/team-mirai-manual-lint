/**
 * handlers/chars.gs — 絵文字・機種依存文字。
 * 担当ルール: A-CHARS-001
 *
 * 対象範囲:
 *   - 絵文字（Emoji 系 Unicode ブロック）
 *   - 機種依存文字（丸数字 ①②、ローマ数字 ⅠⅡ、括弧付き漢字 ㈠ など）
 * 除外:
 *   - allowed_symbols（rules.json で許容指定。⭕ ❌ ✅ など）
 *
 * サロゲートペア（U+10000 以上の絵文字）に対応するため for...of で反復し、UTF-16 上のオフセットも計算。
 */

this.checkForbiddenChars = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];

  var allowedSymbols = params.allowed_symbols || ['⭕', '❌', '✅'];
  var allowedSet = {};
  for (var a = 0; a < allowedSymbols.length; a++) {
    allowedSet[allowedSymbols[a]] = true;
  }

  // 絵文字の主要ブロック
  var emojiRanges = [
    [0x1F300, 0x1F9FF],  // Misc Symbols And Pictographs / Emoticons / Transport / Sup Sym & Pic / Geometric Ext / Sup Arrows / Sup Math / etc.
    [0x1FA70, 0x1FAFF],  // Symbols and Pictographs Extended-A
    [0x2600, 0x26FF],    // Miscellaneous Symbols
    [0x2700, 0x27BF],    // Dingbats
    [0x2300, 0x23FF],    // Miscellaneous Technical
    [0x1F000, 0x1F02F]   // Mahjong Tiles
  ];
  // 機種依存文字（典型例）
  var machineDepRanges = [
    [0x2460, 0x24FF],    // 丸数字・括弧付き数字（① ⒈ など）
    [0x2160, 0x217F],    // ローマ数字（Ⅰ Ⅱ など）
    [0x3220, 0x3243],    // 括弧付き漢字
    [0x32A0, 0x32FE],    // 機種依存記号
    [0x3000, 0x3000]     // ※全角スペース等は外す（ここはダミー）
  ];
  // 全角スペースを誤って入れないよう machineDepRanges 末尾は dummy。実害なし。

  function inRanges(cp, ranges) {
    for (var r = 0; r < ranges.length - 0; r++) {
      if (cp >= ranges[r][0] && cp <= ranges[r][1]) return true;
    }
    return false;
  }

  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    if (!p.text) continue;

    // for...of でコードポイント反復（サロゲートペア対応）
    var utf16Offset = 0;
    for (var ch of p.text) {
      if (allowedSet[ch]) {
        utf16Offset += ch.length;
        continue;
      }
      var cp = ch.codePointAt(0);

      // 全角スペース・全角感嘆符・全角疑問符・各種約物は意図的に使われるため除外
      // U+3000 全角スペース、U+FF01-FF60 全角 ASCII 相当、U+FFE0-FFE6
      var isJapanesePunct = (cp === 0x3000) ||
                            (cp >= 0xFF01 && cp <= 0xFF60) ||
                            (cp >= 0xFFE0 && cp <= 0xFFE6);
      if (isJapanesePunct) {
        utf16Offset += ch.length;
        continue;
      }

      var isEmoji = inRanges(cp, emojiRanges);
      var isMachineDep = inRanges(cp, machineDepRanges);

      if (isEmoji || isMachineDep) {
        var label = isEmoji ? '絵文字' : '機種依存文字';
        var hex = cp.toString(16).toUpperCase();
        while (hex.length < 4) hex = '0' + hex;

        findings.push(tmLintMakeFinding_(rule, {
          location: { type: 'paragraph', index: p.index,
                      hint: '段落 ' + (i + 1) + ' / 位置 ' + (utf16Offset + 1) },
          startOffset: utf16Offset,
          endOffset: utf16Offset + ch.length,
          snippet: tmLintTruncate(p.text.substring(Math.max(0, utf16Offset - 5), utf16Offset + ch.length + 5), 80),
          message: rule.message + '（実値: 「' + ch + '」 U+' + hex + ' ' + label + '）'
        }));
      }

      utf16Offset += ch.length;
    }
  }
  return findings;
};
