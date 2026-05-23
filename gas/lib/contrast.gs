/**
 * lib/contrast.gs — WCAG 2.x 相対輝度およびコントラスト比の固定式。
 *
 * 設計根拠: DESIGN.md §5 却下案1
 *   「色・pt・余白・コントラスト比は WCAG 等の固定式／完全一致 で答えが一意。
 *    LLM を噛ませると無料・厳密・即時で出る判定に課金・遅延・非決定性を持ち込み精度を下げる。」
 *
 * 参照: WCAG 2.2 - Relative luminance / Contrast ratio
 *   https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 *   https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

this.tmLintHexToRgb = function(hex) {
  if (!hex) return null;
  var h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
  if (h.length !== 6) return null;
  var r = parseInt(h.substr(0, 2), 16);
  var g = parseInt(h.substr(2, 2), 16);
  var b = parseInt(h.substr(4, 2), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r: r, g: g, b: b };
};

this.tmLintRelativeLuminance = function(rgb) {
  function toLinear(c) {
    var s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
};

this.tmLintContrastRatio = function(fgHex, bgHex) {
  var fg = tmLintHexToRgb(fgHex);
  var bg = tmLintHexToRgb(bgHex || '#ffffff');
  if (!fg || !bg) return null;
  var l1 = tmLintRelativeLuminance(fg);
  var l2 = tmLintRelativeLuminance(bg);
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};
