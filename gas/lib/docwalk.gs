/**
 * lib/docwalk.gs — Document を走査して段落 / Run / 表構造を返す。
 *
 * 段落・Run 走査は editAsText().getTextAttributeIndices() ベースで分解。
 * namedStyles 継承解決は Advanced Docs Service `Docs.Documents.get` で取得し、
 * 各 HeadingType の既定 textStyle を解決マップに展開、各 Run の null 属性に注入する。
 *
 * Advanced Docs Service が未有効化の場合、namedStylesMap が null となり、
 * effective 系の値は run の生属性のみで決まる（継承解決なし）。
 *
 * 未対応（次フェーズ）:
 *   - tables の本走査（表セル内段落の Run 分解）
 *   - footerParagraphs
 */

this.tmLintWalkDoc = function(doc) {
  var body = doc.getBody();
  var paragraphs = [];
  var totalChildren = body.getNumChildren();

  // Advanced Docs Service で namedStyles を解決（有効化されていれば）。
  var namedStylesMap = tmLintResolveNamedStyles_(doc);

  for (var i = 0; i < totalChildren; i++) {
    var element = body.getChild(i);
    var type = element.getType();
    if (type !== DocumentApp.ElementType.PARAGRAPH &&
        type !== DocumentApp.ElementType.LIST_ITEM) continue;

    var para = (type === DocumentApp.ElementType.PARAGRAPH)
      ? element.asParagraph()
      : element.asListItem();

    var headingType = tmLintSafeGetHeading_(para);
    var headingKey = tmLintHeadingToKey_(headingType);
    var inheritedStyle = (namedStylesMap && namedStylesMap[headingKey]) ? namedStylesMap[headingKey] : null;

    paragraphs.push({
      paragraph: para,
      index: i,
      isListItem: (type === DocumentApp.ElementType.LIST_ITEM),
      headingType: headingType,
      headingKey: headingKey,
      alignment: tmLintSafeGetAlignment_(para),
      lineSpacing: tmLintSafeGetLineSpacing_(para),
      firstLineIndent: tmLintSafeGetIndent_(para),
      text: para.getText(),
      runs: tmLintExtractRuns_(para, inheritedStyle)
    });
  }

  return {
    paragraphs: paragraphs,
    tables: [],
    footerParagraphs: [],
    namedStylesMap: namedStylesMap,
    namedStylesAvailable: (namedStylesMap !== null)
  };
};

/**
 * Advanced Docs Service `Docs.Documents.get` で namedStyles を取得して
 * { TITLE: {...}, HEADING1: {...}, ..., NORMAL: {...} } の解決マップに変換。
 * Advanced Service 未有効化なら null を返す。
 */
function tmLintResolveNamedStyles_(doc) {
  if (typeof Docs === 'undefined' || !Docs.Documents) {
    return null;
  }
  try {
    var docId = doc.getId();
    var docResource = Docs.Documents.get(docId);
    if (!docResource || !docResource.namedStyles || !docResource.namedStyles.styles) {
      return null;
    }
    var map = {};
    var styles = docResource.namedStyles.styles;
    for (var i = 0; i < styles.length; i++) {
      var ns = styles[i];
      var key = tmLintNamedStyleTypeToKey_(ns.namedStyleType);
      if (!key) continue;
      var ts = ns.textStyle || {};
      map[key] = {
        fontFamily: (ts.weightedFontFamily && ts.weightedFontFamily.fontFamily) ? ts.weightedFontFamily.fontFamily : null,
        fontSize: (ts.fontSize && typeof ts.fontSize.magnitude === 'number') ? ts.fontSize.magnitude : null,
        bold: (typeof ts.bold === 'boolean') ? ts.bold : null,
        foreground: ts.foregroundColor ? tmLintDocsColorToHex_(ts.foregroundColor) : null,
        background: ts.backgroundColor ? tmLintDocsColorToHex_(ts.backgroundColor) : null
      };
    }
    return map;
  } catch (e) {
    return null;
  }
}

// Advanced Docs Service の namedStyleType → docwalk 内部キー。
function tmLintNamedStyleTypeToKey_(t) {
  var m = {
    'TITLE': 'TITLE',
    'SUBTITLE': 'SUBTITLE',
    'HEADING_1': 'HEADING1',
    'HEADING_2': 'HEADING2',
    'HEADING_3': 'HEADING3',
    'HEADING_4': 'HEADING4',
    'HEADING_5': 'HEADING5',
    'HEADING_6': 'HEADING6',
    'NORMAL_TEXT': 'NORMAL'
  };
  return m[t] || null;
}

// DocumentApp.ParagraphHeading → docwalk 内部キー。
function tmLintHeadingToKey_(h) {
  if (!h) return 'NORMAL';
  var H = DocumentApp.ParagraphHeading;
  if (h === H.TITLE) return 'TITLE';
  if (h === H.SUBTITLE) return 'SUBTITLE';
  if (h === H.HEADING1) return 'HEADING1';
  if (h === H.HEADING2) return 'HEADING2';
  if (h === H.HEADING3) return 'HEADING3';
  if (h === H.HEADING4) return 'HEADING4';
  if (h === H.HEADING5) return 'HEADING5';
  if (h === H.HEADING6) return 'HEADING6';
  return 'NORMAL';
}

// Advanced Docs Service の Color/OptionalColor → "#rrggbb"。
function tmLintDocsColorToHex_(optionalColor) {
  try {
    if (!optionalColor || !optionalColor.color) return null;
    var rgb = optionalColor.color.rgbColor;
    if (!rgb) return null;
    var r = Math.round((rgb.red || 0) * 255);
    var g = Math.round((rgb.green || 0) * 255);
    var b = Math.round((rgb.blue || 0) * 255);
    return '#' + [r, g, b].map(function(v) {
      var h = v.toString(16);
      return h.length === 1 ? '0' + h : h;
    }).join('');
  } catch (e) {
    return null;
  }
}

function tmLintExtractRuns_(paragraph, inheritedStyle) {
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

  var endpoints = indices.slice();
  if (endpoints[endpoints.length - 1] !== content.length) {
    endpoints.push(content.length);
  }

  var inherited = inheritedStyle || {};
  var runs = [];
  for (var i = 0; i < endpoints.length - 1; i++) {
    var s = endpoints[i];
    var e = endpoints[i + 1];
    if (e <= s) continue;

    var fontFamily = tmLintSafeRunAttr_(text, 'getFontFamily', s);
    var fontSize = tmLintSafeRunAttr_(text, 'getFontSize', s);
    var bold = tmLintSafeRunAttr_(text, 'isBold', s);
    var foreground = tmLintSafeRunAttr_(text, 'getForegroundColor', s);
    var background = tmLintSafeRunAttr_(text, 'getBackgroundColor', s);
    var linkUrl = tmLintSafeRunAttr_(text, 'getLinkUrl', s);

    runs.push({
      start: s,
      end: e,
      text: content.substring(s, e),
      // 生の Run 属性（null = 「未設定」）
      fontFamily: fontFamily,
      fontSize: fontSize,
      bold: bold,
      foreground: foreground,
      background: background,
      linkUrl: linkUrl,
      // namedStyle 継承解決済みの実効値（null は「Run も namedStyle も未設定」を意味する）
      effectiveFontFamily: (fontFamily !== null) ? fontFamily : (inherited.fontFamily || null),
      effectiveFontSize: (fontSize !== null) ? fontSize : (inherited.fontSize || null),
      effectiveBold: (bold !== null) ? bold : ((inherited.bold === true) ? true : false),
      effectiveForeground: (foreground !== null) ? foreground : (inherited.foreground || null),
      effectiveBackground: (background !== null) ? background : (inherited.background || null)
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
