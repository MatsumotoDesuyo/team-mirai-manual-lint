/**
 * handlers/table.gs — 表のスタイル。
 * 担当ルール: A-TABLE-001 / A-TABLE-002 / A-TABLE-003
 */

this.checkTableHeaderRow = function(ctx, params, rule) {
  // TODO: ctx.walked.tables を走査。各 Table.getRow(0) の全 Cell について
  //   - Cell.getBackgroundColor() === params.bg
  //   - 各 Run の effectiveForeground === params.fg
  //  違反 Cell ごとに Finding。
  return [tmLintTodoFinding_(rule, '表の先頭行 Cell の bg/fg を ' + params.bg + '/' + params.fg + ' と比較')];
};

this.checkTableHeaderColumn = function(ctx, params, rule) {
  // TODO: 各 Row の左端 Cell (Cell index 0) の bg / fg を検査。
  return [tmLintTodoFinding_(rule, '各行左端 Cell の bg/fg を ' + params.bg + '/' + params.fg + ' と比較')];
};

this.checkTableBorder = function(ctx, params, rule) {
  // TODO: DocumentApp の罫線取得 API は限定的なため、
  //  Advanced Docs Service `Docs.Documents.get(doc.getId())` で
  //  table.tableRows[].tableCells[].tableCellStyle.borderTop/Bottom/Left/Right.{color,width} を取得。
  //  width は EMU (914400 EMU = 1 inch = 72pt)。1pt = 12700 EMU。
  return [tmLintTodoFinding_(rule, 'Advanced Docs Service で tableCellStyle.borderXxx を取得し色/太さを検査')];
};
