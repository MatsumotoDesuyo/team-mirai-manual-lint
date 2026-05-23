/**
 * handlers/color.gs — 文字色・背景色・コントラスト関連。
 * 担当ルール: A-COLOR-001 / A-COLOR-002 / A-COLOR-003 / A-COLOR-004
 *
 * docwalk.gs が namedStyles 継承解決済みの effectiveForeground / effectiveBackground を
 * Run に付与している前提。Advanced Docs Service 未有効時は継承解決が効かないが、
 * Run 個別に色が設定されていれば検出は可能。
 */

this.checkDefaultTextColor = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var defaultColor = (params.default_color || '#000000').toLowerCase();
  var exempt = params.exempt_contexts || [];
  var exemptLink = exempt.indexOf('link') !== -1;
  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text || !run.text.trim()) continue;
      if (exemptLink && run.linkUrl) continue;

      var effective = run.effectiveForeground;
      if (effective === null) continue; // 解決不可は判定保留
      if (effective.toLowerCase() === defaultColor) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + effective + '）'
      }));
    }
  }
  return findings;
};

this.checkForbiddenTextColor = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var forbidden = (params.forbidden_colors || []).map(function(c) { return c.toLowerCase(); });
  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text || !run.text.trim()) continue;
      var effective = run.effectiveForeground;
      if (effective === null) continue;
      if (forbidden.indexOf(effective.toLowerCase()) === -1) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + effective + '）'
      }));
    }
  }
  return findings;
};

this.checkAllowedHighlightColor = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  // raw（Run 個別の background）で判定する。「強調用の文字背景色」はガイドライン上 Run 単位の
  // 装飾として明示的に設定されるもので、namedStyle 由来の背景は対象外。
  var allowed = (params.allowed_highlights || []).map(function(c) { return c === null ? null : c.toLowerCase(); });
  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text || !run.text.trim()) continue;
      if (run.background === null) continue; // 背景なしは判定対象外
      if (allowed.indexOf(run.background.toLowerCase()) !== -1) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + run.background + '）'
      }));
    }
  }
  return findings;
};

this.checkContrast = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];

  // common.wcag を rules.json から取得（fallback で固定値）。
  var wcag = (ctx.rules && ctx.rules.common && ctx.rules.common.wcag) ? ctx.rules.common.wcag : {
    contrast_normal: 4.5,
    contrast_large: 3.0,
    large_size_pt: 18,
    large_bold_size_pt: 14
  };

  var findings = [];

  for (var i = 0; i < ctx.walked.paragraphs.length; i++) {
    var p = ctx.walked.paragraphs[i];
    for (var j = 0; j < p.runs.length; j++) {
      var run = p.runs[j];
      if (!run.text || !run.text.trim()) continue;

      var fg = run.effectiveForeground || '#000000';
      var bg = run.effectiveBackground || '#ffffff';
      var ratio = tmLintContrastRatio(fg, bg);
      if (ratio === null) continue;

      var size = run.effectiveFontSize;
      var bold = run.effectiveBold === true;
      var isLarge = (typeof size === 'number') && (
        size >= wcag.large_size_pt ||
        (bold && size >= wcag.large_bold_size_pt)
      );
      var threshold = isLarge ? wcag.contrast_large : wcag.contrast_normal;

      if (ratio >= threshold) continue;

      findings.push(tmLintMakeFinding_(rule, {
        location: { type: 'run', index: p.index, hint: '段落 ' + (i + 1) + ' / Run ' + (j + 1) },
        startOffset: run.start,
        endOffset: run.end,
        snippet: tmLintTruncate(run.text, 80),
        message: rule.message + '（実値: ' + ratio.toFixed(2) + ':1 / 期待: '
                 + threshold + ':1 / fg=' + fg + ', bg=' + bg + (isLarge ? ', large' : '') + '）'
      }));
    }
  }
  return findings;
};
