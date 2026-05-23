/**
 * lib/docwalk.gs — Document を走査して段落 / Run / 表構造を返す。
 *
 * 本実装フェーズ 1: editAsText().getTextAttributeIndices() ベースの Run 分解。
 *   各 Run には fontFamily / fontSize / bold / foreground / background / linkUrl を載せる。
 *
 * 未対応（次フェーズ）:
 *   - namedStyles 継承解決（Advanced Docs Service `Docs.Documents.get` 経由）
 *     現状は editAsText().getFontFamily(offset) 等が null を返した場合「未設定（継承）」として
 *     handler 側でそのまま扱う。完全継承解決は次フェーズで足す。
 *   - tables の本走査（表セル内段落の Run 分解）。雛形のまま。
 *   - footerParagraphs。雛形のまま。
 */

this.tmLintWalkDoc = function(doc) {
  var body = doc.getBody();
  var paragraphs = [];
  var totalChildren = body.getNumChildren();

  for (var i = 0; i < totalChildren; i++) {
    var element = body.getChild(i);
    var type = element.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH &&
        type !== DocumentApp.ElementType.LIST_ITEM) continue;

    var para = (type === DocumentApp.ElementType.PARAGRAPH)
      ? element.asParagraph()
      : element.asListItem();

    paragraphs.push({
      paragraph: para,
      index: i,
      isListItem: (type === DocumentApp.ElementType.LIST_ITEM),
      headingType: tmLintSafeGetHeading_(para),
      alignment: tmLintSafeGetAlignment_(para),
      lineSpacing: tmLintSafeGetLineSpacing_(para),
      firstLineIndent: tmLintSafeGetIndent_(para),
      text: para.getText(),
      runs: tmLintExtractRuns_(para)
    });
  }

  return {
    paragraphs: paragraphs,
    tables: [],          // 次フェーズで本実装
    footerParagraphs: [] // 次フェーズで本実装
  };
};

function tmLintExtractRuns_(paragraph) {
  var text;
  try {
    text = paragraph.editAsText();
  } catch (e) {
    return [];
  }
  var content = text.getText();
  if (!content || content.length === 0) return [];

  var indices;
  try {
    indices = text.getTextAttributeIndices();
  } catch (e) {
    indices = [0];
  }
  if (!indices || indices.length === 0) indices = [0];

  // 末尾を含む境界配列を作る。
  var endpoints = indices.slice();
  if (endpoints[endpoints.length - 1] !== content.length) {
    endpoints.push(content.length);
  }

  var runs = [];
  for (var i = 0; i < endpoints.length - 1; i++) {
    var s = endpoints[i];
    var e = endpoints[i + 1];
    if (e <= s) continue;
    runs.push({
      start: s,
      end: e,
      text: content.substring(s, e),
      fontFamily: tmLintSafeRunAttr_(text, 'getFontFamily', s),
      fontSize: tmLintSafeRunAttr_(text, 'getFontSize', s),
      bold: tmLintSafeRunAttr_(text, 'isBold', s),
      foreground: tmLintSafeRunAttr_(text, 'getForegroundColor', s),
      background: tmLintSafeRunAttr_(text, 'getBackgroundColor', s),
      linkUrl: tmLintSafeRunAttr_(text, 'getLinkUrl', s)
    });
  }
  return runs;
}

function tmLintSafeRunAttr_(text, methodName, offset) {
  try {
    return text[methodName](offset);
  } catch (e) {
    return null;
  }
}

function tmLintSafeGetHeading_(p) {
  try { return p.getHeading(); } catch (e) { return null; }
}
function tmLintSafeGetAlignment_(p) {
  try { return p.getAlignment(); } catch (e) { return null; }
}
function tmLintSafeGetLineSpacing_(p) {
  try { return p.getLineSpacing(); } catch (e) { return null; }
}
function tmLintSafeGetIndent_(p) {
  try { return p.getIndentFirstLine(); } catch (e) { return null; }
}
