/**
 * handlers/table.gs — 表のスタイル。
 * 担当ルール: A-TABLE-001（見出し行）/ A-TABLE-002（見出し列）/ A-TABLE-003（罫線）
 *
 * docwalk.gs が ctx.walked.tables に展開済みの表構造を渡す前提。各 cell には
 * backgroundColor / runs（cell 内の Run 列）が、各 table.borders には Advanced Docs Service 由来の
 * セル単位罫線情報が入る。
 */

this.checkTableHeaderRow = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.tables) return [];
  var expectedBg = (params.bg || '#666666').toLowerCase();
  var expectedFg = (params.fg || '#ffffff').toLowerCase();
  var findings = [];

  for (var t = 0; t < ctx.walked.tables.length; t++) {
    var table = ctx.walked.tables[t];
    if (!table.rows || table.rows.length === 0) continue;
    var headerRow = table.rows[0];
    for (var c = 0; c < headerRow.cells.length; c++) {
      var cell = headerRow.cells[c];
      var actualBg = cell.backgroundColor ? cell.backgroundColor.toLowerCase() : null;
      var bgOk = (actualBg === expectedBg);
      var fgMismatch = null;
      for (var r = 0; r < cell.runs.length; r++) {
        var run = cell.runs[r];
        if (!run.text || !run.text.trim()) continue;
        var fg = (run.effectiveForeground || '#000000').toLowerCase();
        if (fg !== expectedFg) { fgMismatch = fg; break; }
      }
      if (bgOk && !fgMismatch) continue;

      var details = [];
      if (!bgOk) details.push('bg=' + (actualBg || 'null'));
      if (fgMismatch) details.push('fg=' + fgMismatch);

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'table_cell', index: table.bodyIndex,
                    hint: '表 ' + (t + 1) + ' / 見出し行 / 列 ' + (c + 1) },
        snippet: tmLintTruncate(cell.text, 80),
        message: rule.message + '（実値: ' + details.join(', ')
                 + ' / 期待: bg=' + expectedBg + ', fg=' + expectedFg + '）'
      }));
    }
  }
  return findings;
};

this.checkTableHeaderColumn = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.tables) return [];
  var expectedBg = (params.bg || '#666666').toLowerCase();
  var expectedFg = (params.fg || '#000000').toLowerCase();
  var findings = [];

  for (var t = 0; t < ctx.walked.tables.length; t++) {
    var table = ctx.walked.tables[t];
    if (!table.rows || table.rows.length === 0) continue;
    for (var r = 0; r < table.rows.length; r++) {
      var row = table.rows[r];
      if (!row.cells || row.cells.length === 0) continue;
      var cell = row.cells[0]; // 左端
      var actualBg = cell.backgroundColor ? cell.backgroundColor.toLowerCase() : null;
      var bgOk = (actualBg === expectedBg);
      var fgMismatch = null;
      for (var rr = 0; rr < cell.runs.length; rr++) {
        var run = cell.runs[rr];
        if (!run.text || !run.text.trim()) continue;
        var fg = (run.effectiveForeground || '#000000').toLowerCase();
        if (fg !== expectedFg) { fgMismatch = fg; break; }
      }
      if (bgOk && !fgMismatch) continue;

      var details = [];
      if (!bgOk) details.push('bg=' + (actualBg || 'null'));
      if (fgMismatch) details.push('fg=' + fgMismatch);

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'table_cell', index: table.bodyIndex,
                    hint: '表 ' + (t + 1) + ' / 見出し列 / 行 ' + (r + 1) },
        snippet: tmLintTruncate(cell.text, 80),
        message: rule.message + '（実値: ' + details.join(', ')
                 + ' / 期待: bg=' + expectedBg + ', fg=' + expectedFg + '）'
      }));
    }
  }
  return findings;
};

this.checkTableBorder = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.tables) return [];
  if (!ctx.walked.namedStylesAvailable) {
    return [tmLintTodoFinding_(rule,
      'Advanced Docs Service が無効。Apps Script エディタで「サービス → Google Docs API」を追加してください')];
  }

  var expectedColor = (params.color || '#ffffff').toLowerCase();
  var expectedWidthPt = (typeof params.width_pt === 'number') ? params.width_pt : 1;
  var findings = [];

  for (var t = 0; t < ctx.walked.tables.length; t++) {
    var table = ctx.walked.tables[t];
    if (!table.borders) continue;

    var violations = [];
    for (var r = 0; r < table.borders.length; r++) {
      for (var c = 0; c < table.borders[r].length; c++) {
        var b = table.borders[r][c];
        if (!b) continue;
        var sides = [
          { name: 'top', value: b.top },
          { name: 'bottom', value: b.bottom },
          { name: 'left', value: b.left },
          { name: 'right', value: b.right }
        ];
        for (var s = 0; s < sides.length; s++) {
          var side = sides[s];
          var border = side.value;
          if (!border) continue;
          var colorMismatch = (border.color !== null) && (border.color.toLowerCase() !== expectedColor);
          var widthMismatch = (border.width !== null) && (Math.abs(border.width - expectedWidthPt) > 0.5);
          if (!colorMismatch && !widthMismatch) continue;
          violations.push({
            row: r, col: c, side: side.name,
            color: border.color, width: border.width
          });
        }
      }
    }

    if (violations.length === 0) continue;

    var first = violations[0];
    findings.push(tmLintMakeFinding_(rule, {
      location: { type: 'table_cell', index: table.bodyIndex,
                  hint: '表 ' + (t + 1) + '（違反 ' + violations.length + ' 箇所、最初: 行' + (first.row + 1) + ' / 列' + (first.col + 1) + ' / ' + first.side + '）' },
      snippet: '実値: color=' + (first.color || 'null') + ', width=' + (first.width !== null ? first.width.toFixed(2) + 'pt' : 'null'),
      message: rule.message + '（' + violations.length + ' 箇所違反 / 期待: color=' + expectedColor + ', width=' + expectedWidthPt + 'pt）'
    }));
  }
  return findings;
};
