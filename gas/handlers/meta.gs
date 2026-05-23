/**
 * handlers/meta.gs — フッターページ番号、作成日・更新日記載。
 * 担当ルール: A-META-001（本実装）/ A-META-002（本実装済み）
 *
 * A-META-001 はフッター内の動的ページ番号（autoText の PAGE_NUMBER / PAGE_COUNT）を
 * Advanced Docs Service で検査するため、namedStylesAvailable と同じ前提を要する。
 */

this.checkFooterPageNumber = function(ctx, params, rule) {
  if (typeof Docs === 'undefined' || !Docs.Documents) {
    return [tmLintTodoFinding_(rule,
      'Advanced Docs Service が無効。Apps Script エディタで「サービス → Google Docs API」を追加してください')];
  }

  var requireDynamic = params.require_dynamic === true;
  var expectedAlignment = params.alignment || 'RIGHT'; // 「RIGHT」 ↔ Docs API "END"
  var expectedAlignmentDocs = (expectedAlignment === 'RIGHT') ? 'END'
                            : (expectedAlignment === 'LEFT') ? 'START'
                            : (expectedAlignment === 'CENTER') ? 'CENTER'
                            : 'END';

  try {
    var docResource = Docs.Documents.get(ctx.doc.getId());
    var footers = docResource.footers || {};
    var footerIds = Object.keys(footers);

    if (footerIds.length === 0) {
      return [tmLintMakeFinding_(rule, {
        location: { type: 'footer', index: -1, hint: 'フッター未設定' },
        snippet: '',
        message: rule.message + '（フッターが設定されていません）'
      })];
    }

    // 各フッターを走査。条件を満たす段落が 1 つでもあれば OK。
    var hasPageNumber = false;
    var hasPageCount = false;
    var hasAlignedPageNumPair = false;
    var footerTextSample = '';

    for (var f = 0; f < footerIds.length; f++) {
      var footer = footers[footerIds[f]];
      var content = footer.content || [];
      for (var c = 0; c < content.length; c++) {
        var elt = content[c];
        if (!elt.paragraph) continue;
        var paragraph = elt.paragraph;
        var paraStyle = paragraph.paragraphStyle || {};
        var alignment = paraStyle.alignment || 'START';
        var elements = paragraph.elements || [];

        var pnInThisPara = false;
        var pcInThisPara = false;
        var paraText = '';
        for (var e = 0; e < elements.length; e++) {
          var el = elements[e];
          if (el.textRun && el.textRun.content) {
            paraText += el.textRun.content;
          }
          if (el.autoText) {
            if (el.autoText.type === 'PAGE_NUMBER') {
              pnInThisPara = true;
              hasPageNumber = true;
              paraText += '<PAGE_NUMBER>';
            }
            if (el.autoText.type === 'PAGE_COUNT') {
              pcInThisPara = true;
              hasPageCount = true;
              paraText += '<PAGE_COUNT>';
            }
          }
        }
        if (!footerTextSample && paraText.trim()) {
          footerTextSample = paraText.trim();
        }
        if (pnInThisPara && pcInThisPara && alignment === expectedAlignmentDocs) {
          hasAlignedPageNumPair = true;
        }
      }
    }

    if (hasAlignedPageNumPair) return [];

    var issues = [];
    if (requireDynamic && (!hasPageNumber || !hasPageCount)) {
      issues.push('動的ページ番号（PAGE_NUMBER / PAGE_COUNT）が揃っていません'
                  + '（PAGE_NUMBER=' + hasPageNumber + ', PAGE_COUNT=' + hasPageCount + '）');
    }
    if (!hasAlignedPageNumPair && hasPageNumber && hasPageCount) {
      issues.push('ページ番号段落の配置が ' + expectedAlignment + ' ではありません');
    }
    if (issues.length === 0) {
      issues.push('「現在ページ / 総ページ数」形式のページ番号が右揃えで設定されていません');
    }

    return [tmLintMakeFinding_(rule, {
      location: { type: 'footer', index: -1, hint: 'フッター' },
      snippet: tmLintTruncate(footerTextSample, 80),
      message: rule.message + '（' + issues.join('、') + '）'
    })];
  } catch (e) {
    return [tmLintMakeFinding_(rule, {
      severity: 'INFO',
      location: { type: 'footer', index: -1, hint: 'フッター取得エラー' },
      snippet: '',
      message: 'フッター情報の取得に失敗: ' + e.message
    })];
  }
};

this.checkCreatedUpdatedDate = function(ctx, params, rule) {
  if (!ctx.walked || !ctx.walked.paragraphs) return [];
  var paragraphs = ctx.walked.paragraphs;
  if (paragraphs.length === 0) return [];

  var n = params.scope_value || 10;
  var start = Math.max(0, paragraphs.length - n);

  var combined = '';
  for (var i = start; i < paragraphs.length; i++) {
    combined += paragraphs[i].text + '\n';
  }

  var patterns = params.patterns || [];
  for (var p = 0; p < patterns.length; p++) {
    var re;
    try {
      re = new RegExp(patterns[p]);
    } catch (e) {
      continue;
    }
    if (re.test(combined)) {
      return [];
    }
  }

  var preview = combined.replace(/\n+/g, ' / ').trim();
  return [tmLintMakeFinding_(rule, {
    location: { type: 'document', index: -1, hint: '本文末尾 ' + n + ' 段落' },
    snippet: tmLintTruncate(preview, 80),
    message: rule.message
  })];
};
