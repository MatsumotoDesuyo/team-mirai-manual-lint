/**
 * lib/docwalk.gs — Document を走査して段落 / Run / 表構造を返す。
 *
 * 段落・Run 走査は editAsText().getTextAttributeIndices() ベースで分解。
 * namedStyles 継承解決は Advanced Docs Service `Docs.Documents.get` で取得。
 * 表セルの罫線情報も Advanced Docs Service の tableCellStyle.borderXxx から取得。
 *
 * Advanced Docs Service が未有効化の場合、namedStylesMap = null、各 table.borders = null。
 * handler 側で namedStylesAvailable をチェックして TODO Finding 化する。
 */

this.tmLintWalkDoc = function(doc) {
  var body = doc.getBody();
  var paragraphs = [];
  var tables = [];
  var totalChildren = body.getNumChildren();

  // Advanced Docs Service で namedStyles と表の罫線情報を一度に取得。
  var advanced = tmLintFetchAdvancedDocsData_(doc);
  var namedStylesMap = advanced ? advanced.namedStylesMap : null;
  var tableBorders = advanced ? advanced.tableBorders : null;

  var tableSeq = 0;
  for (var i = 0; i < totalChildren; i++) {
    var element = body.getChild(i);
    var type = element.getType();

    if (type === DocumentApp.ElementType.PARAGRAPH ||
        type === DocumentApp.ElementType.LIST_ITEM) {
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
    } else if (type === DocumentApp.ElementType.TABLE) {
      var table = element.asTable();
      var borders = (tableBorders && tableBorders[tableSeq]) ? tableBorders[tableSeq] : null;
      tables.push(tmLintExtractTable_(table, i, tableSeq, borders, namedStylesMap));
      tableSeq++;
    }
  }

  return {
    paragraphs: paragraphs,
    tables: tables,
    footerParagraphs: [],
    namedStylesMap: namedStylesMap,
    namedStylesAvailable: (namedStylesMap !== null)
  };
};

/**
 * Advanced Docs Service `Docs.Documents.get` で必要な情報を一括取得:
 *   - namedStyles 解決マップ
 *   - 表ごとのセル罫線情報配列
 */
function tmLintFetchAdvancedDocsData_(doc) {
  if (typeof Docs === 'undefined' || !Docs.Documents) {
    return null;
  }
  try {
    var docResource = Docs.Documents.get(doc.getId());
    if (!docResource) return null;

    var namedStylesMap = null;
    if (docResource.namedStyles && docResource.namedStyles.styles) {
      namedStylesMap = {};
      var styles = docResource.namedStyles.styles;
      for (var i = 0; i < styles.length; i++) {
        var ns = styles[i];
        var key = tmLintNamedStyleTypeToKey_(ns.namedStyleType);
        if (!key) continue;
        var ts = ns.textStyle || {};
        namedStylesMap[key] = {
          fontFamily: (ts.weightedFontFamily && ts.weightedFontFamily.fontFamily) ? ts.weightedFontFamily.fontFamily : null,
          fontSize: (ts.fontSize && typeof ts.fontSize.magnitude === 'number') ? ts.fontSize.magnitude : null,
          bold: (typeof ts.bold === 'boolean') ? ts.bold : null,
          foreground: ts.foregroundColor ? tmLintDocsColorToHex_(ts.foregroundColor) : null,
          background: ts.backgroundColor ? tmLintDocsColorToHex_(ts.backgroundColor) : null
        };
      }
    }

    // 表ごとの罫線情報。body.content[] の table のみを順に取り出す。
    var tableBorders = [];
    var content = (docResource.body && docResource.body.content) ? docResource.body.content : [];
    for (var c = 0; c < content.length; c++) {
      var elt = content[c];
      if (!elt.table) continue;
      var rows = elt.table.tableRows || [];
      var rowBorders = [];
      for (var r = 0; r < rows.length; r++) {
        var cells = rows[r].tableCells || [];
        var cellBorders = [];
        for (var cc = 0; cc < cells.length; cc++) {
          var cs = cells[cc].tableCellStyle || {};
          cellBorders.push({
            top: tmLintParseBorder_(cs.borderTop),
            bottom: tmLintParseBorder_(cs.borderBottom),
            left: tmLintParseBorder_(cs.borderLeft),
            right: tmLintParseBorder_(cs.borderRight),
            backgroundColor: cs.backgroundColor ? tmLintDocsColorToHex_(cs.backgroundColor) : null
          });
        }
        rowBorders.push(cellBorders);
      }
      tableBorders.push(rowBorders);
    }

    return {
      namedStylesMap: namedStylesMap,
      tableBorders: tableBorders
    };
  } catch (e) {
    return null;
  }
}

function tmLintExtractTable_(table, bodyIndex, tableSeq, borders, namedStylesMap) {
  var rows = [];
  var numRows = 0;
  try { numRows = table.getNumRows(); } catch (e) { numRows = 0; }

  for (var r = 0; r < numRows; r++) {
    var row;
    try { row = table.getRow(r); } catch (e) { continue; }
    var cells = [];
    var numCells = 0;
    try { numCells = row.getNumCells(); } catch (e) { numCells = 0; }
    for (var c = 0; c < numCells; c++) {
      var cell;
      try { cell = row.getCell(c); } catch (e) { continue; }
      cells.push({
        cell: cell,
        rowIndex: r,
        colIndex: c,
        backgroundColor: tmLintSafeCellBg_(cell),
        text: cell.getText(),
        runs: tmLintExtractCellRuns_(cell, namedStylesMap)
      });
    }
    rows.push({ rowIndex: r, cells: cells });
  }

  return {
    table: table,
    bodyIndex: bodyIndex,
    tableSeq: tableSeq,
    rows: rows,
    borders: borders  // null or [row][col].{top,bottom,left,right,backgroundColor}
  };
}

function tmLintExtractCellRuns_(cell, namedStylesMap) {
  var runs = [];
  var numChildren = 0;
  try { numChildren = cell.getNumChildren(); } catch (e) { return []; }
  for (var i = 0; i < numChildren; i++) {
    var element;
    try { element = cell.getChild(i); } catch (e) { continue; }
    var t = element.getType();
    if (t !== DocumentApp.ElementType.PARAGRAPH &&
        t !== DocumentApp.ElementType.LIST_ITEM) continue;
    var p = (t === DocumentApp.ElementType.PARAGRAPH)
      ? element.asParagraph()
      : element.asListItem();
    var hKey = tmLintHeadingToKey_(tmLintSafeGetHeading_(p));
    var inherited = (namedStylesMap && namedStylesMap[hKey]) ? namedStylesMap[hKey] : null;
    var cellRuns = tmLintExtractRuns_(p, inherited);
    runs = runs.concat(cellRuns);
  }
  return runs;
}

function tmLintSafeCellBg_(cell) {
  try { return cell.getBackgroundColor(); } catch (e) { return null; }
}

function tmLintParseBorder_(border) {
  if (!border) return null;
  return {
    color: border.color ? tmLintDocsColorToHex_(border.color) : null,
    width: (border.width && typeof border.width.magnitude === 'number') ? border.width.magnitude : null,
    dashStyle: border.dashStyle || null
  };
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

// Advanced Docs Service の OptionalColor → "#rrggbb"。
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
      fontFamily: fontFamily,
      fontSize: fontSize,
      bold: bold,
      foreground: foreground,
      background: background,
      linkUrl: linkUrl,
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
