/**
 * lib/docwalk.gs — Document を走査して namedStyles 継承解決済みの構造を返す。
 *
 * 設計根拠: DESIGN.md §3 Layer A
 *   「namedStyles 継承解決込み」が前提。多くのルールは段落の HeadingType に紐づく
 *   既定スタイルを継承して効くため、各 Run の getFontFamily 等が null を返すケースが多い。
 *   本ユーティリティが解決済みの effectiveStyle を各要素に付ける。
 *
 * 雛形段階: API シェイプのみ提供。実装は handler 個別実装時に詰める。
 */

this.tmLintWalkDoc = function(doc) {
  // 戻り値の型:
  //   {
  //     paragraphs: [{
  //       paragraph: Paragraph,
  //       index: number,
  //       headingType: ParagraphHeading,
  //       effectiveAlignment: HorizontalAlignment,
  //       effectiveLineSpacing: number,
  //       effectiveFirstLineIndent: number,
  //       runs: [{
  //         text: string,
  //         element: Text,
  //         offset: number,
  //         length: number,
  //         effectiveFontFamily: string,
  //         effectiveFontSize: number,
  //         effectiveBold: boolean,
  //         effectiveForeground: string,  // "#rrggbb"
  //         effectiveBackground: string,  // "#rrggbb" or null
  //         linkUrl: string | null
  //       }]
  //     }],
  //     tables: [{ table: Table, rowCount: number, cells: [[{...}]] }],
  //     footerParagraphs: [{...}] | []
  //   }
  //
  // TODO: handler 実装フェーズで本実装。
  //  - namedStyles を Advanced Docs Service `Docs.Documents.get(docId)` で取得し、
  //    各 HeadingType の既定 textStyle / paragraphStyle を表に展開
  //  - DocumentApp 側で各 Text Run を走査し、null 属性は namedStyle にフォールバック
  //  - 表セルは Run 単位まで掘る
  //
  // 雛形では空配列を返す。
  return {
    paragraphs: [],
    tables: [],
    footerParagraphs: []
  };
};
