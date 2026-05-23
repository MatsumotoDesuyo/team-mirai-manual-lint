# 判定マトリクス — rules.json の設計図

[DESIGN.md](DESIGN.md) §8 で求められた成果物。[GUIDELINES.md](GUIDELINES.md) 全項目を Layer A（決定論・GAS）/ Layer B（意味・LLM）/ Layer C（人間専管）/ OUT（自動化不可）に仕分け、ルール ID を割り当てる。

実装（[rules.json](rules.json) および `gas/` 配下）は本マトリクスの行を満たす形で進める。

## ルール ID 規約

- 形式: `{Layer}-{Category}-{連番}`（例: `A-COLOR-001`）
- Layer プレフィクス: `A` / `B` / `C` / `OUT`
- Category: `LAYOUT` `FONT` `COLOR` `EMPHASIS` `TABLE` `CHARS` `META` `LINK` `TEXT` `TONE` `STRUCT` `LEGAL` `COPYRIGHT` `SAFETY`
- 連番は category 内で 3 桁ゼロ詰め。欠番は許容する（廃止 ID は再利用しない）。

## 重大度

- `ERROR` — Layer A 決定論違反（確実）
- `WARN` — Layer B LLM 助言（参考）
- `INFO` — 人間確認領域の提示／Layer C／OUT

## マトリクス

### §1 考え方

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TONE-001` | §1 チームみらいらしさの反映 / 価値観の踏襲 | B | WARN | LLM プロンプト: 「文章が『手を動かす／オープン／誰かをおとしめない／分断を煽らない／決めつけない』の価値観に反していないか」を例示付きで判定 | rules.json (LLM プロンプトテンプレ) + 価値観の原文 | 政策説明の事実記述を「決めつけ」と誤認 |
| `B-TONE-002` | §1 チームみらいらしさの反映 / 文章のトーン | B | WARN | LLM プロンプト: 「固すぎる／煽情的／砕けすぎ」を 3 段階で評価。守るべきルールは厳格トーンも可と注記 | rules.json (LLM プロンプトテンプレ) | 法令解説節での厳格トーンを「固すぎ」と誤判定 |
| `B-TONE-003` | §1 チームみらいらしさの反映 / 読み手視点で書く | B | WARN | LLM プロンプト: 「運営側目線」「主語が運営に偏る」「専門用語の説明欠落」を検出 | rules.json (LLM プロンプトテンプレ) | サポーター向け部分の運営目線を許容するべき箇所での過剰検出 |
| `OUT-SAFETY-001` | §1 安全への配慮を最優先 | OUT | INFO | 機械判定不可（具体的行動内容の妥当性判断）。レポートに「人間確認必須」タグを必ず出す | なし | — |

### §2 デザインルール

#### 基本設定

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-LAYOUT-001` | §2 基本設定 / 余白 2cm 上下左右 | A | ERROR | `Document.getBody().getMarginTop()` 等 4 方向を取得し、72pt/inch・2.54cm/inch 換算で 2cm（≒ 56.69pt）と一致するか。±1pt 許容 | rules.json: `margin_cm: 2`, `tolerance_pt: 1` | pt/cm 換算誤差。テンプレ既定値が pt 単位で 56 や 57 等になっている場合 |
| `A-META-001` | §2 基本設定 / ページ番号フッター右下 1/5 形式 | A | ERROR | `Document.getFooter()` の段落 alignment 右、テキストに `<currentPage>/<totalPages>` 形式または Apps Script の `addPageNumber()` 由来要素を検出 | rules.json: `footer_pattern: ".*\\d+\\s*/\\s*\\d+.*"` | フッター手書きで `1/5` と書かれた静的テキストはマニュアル冒頭で固定化されてしまっている場合検出可。動的ページ番号要素の検出は GAS API 制約あり |
| `OUT-META-001` | §2 基本設定 / 総ページ数 | OUT | INFO | `documents.get` は自動改行後のページ数を返さない。Drive API で PDF エクスポート→ページ数カウントは将来検討（DESIGN.md §6） | なし | — |

#### フォント

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-FONT-001` | §2 フォントファミリ / 日本語 Noto Sans JP・英数 Noto Sans | A | ERROR | 全 Text Run の `getFontFamily()` を `namedStyles` 継承解決込みで取得し、`Noto Sans JP` または `Noto Sans` 以外を検出 | rules.json: `allowed_fonts: ["Noto Sans JP", "Noto Sans"]` | 既定値継承未解決時の null/空値、フォント名のバリアント表記（`Noto Sans Japanese` 等） |
| `A-FONT-002` | §2 見出しレベルのスタイル設定 / タイトル 21pt 太字 | A | ERROR | `HeadingType.TITLE` 段落の Run の `getFontSize() == 21` かつ `isBold() == true` | rules.json: `heading_styles.TITLE: {size:21, bold:true}` | 見出しスタイル未適用で本文として 21pt 太字を書いている場合は別ルール（強調）判定 |
| `A-FONT-003` | §2 見出しレベルのスタイル設定 / 見出し1 18pt 太字 | A | ERROR | `HeadingType.HEADING1` 段落の Run の `getFontSize() == 18` かつ `isBold() == true` | rules.json: `heading_styles.HEADING1` | 同上 |
| `A-FONT-004` | §2 見出しレベルのスタイル設定 / 見出し2 15pt 太字 | A | ERROR | `HeadingType.HEADING2` 段落の Run の `getFontSize() == 15` かつ `isBold() == true` | rules.json: `heading_styles.HEADING2` | 同上 |
| `A-FONT-005` | §2 見出しレベルのスタイル設定 / 見出し3 13pt 太字 | A | ERROR | `HeadingType.HEADING3` 段落の Run の `getFontSize() == 13` かつ `isBold() == true` | rules.json: `heading_styles.HEADING3` | 同上 |
| `A-FONT-006` | §2 見出しレベルのスタイル設定 / 本文 11pt 標準 | A | ERROR | `HeadingType.NORMAL` 段落の Run の `getFontSize() == 11`、`isBold() == false`（強調用太字は別ルール判定） | rules.json: `heading_styles.NORMAL: {size:11, bold:false}` | 強調太字を NORMAL 段落内で許容（`A-EMPHASIS-001` で別判定）。本ルールは「全体としての本文サイズ」を判定するため、各 Run でなく段落代表値で判定する設計余地あり |
| `A-FONT-007` | §2 11pt 未満禁止（引用例外） | A | ERROR | 全 Run の `getFontSize() < 11` を検出。例外: 段落の HeadingType または親要素が「引用」コンテキストに該当する場合は除外 | rules.json: `min_font_size_pt: 11`, `exempt_contexts: ["quote_block"]` | 引用判定が曖昧。GAS には明示的な「引用ブロック」型がなく、インデント・スタイル名で推定するしかない |

#### 段落配置・行間

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-LAYOUT-002` | §2 文字の位置 / 左揃え | A | ERROR | 全 Paragraph の `getAlignment() == HorizontalAlignment.LEFT`（表セル等の特例除く） | rules.json: `default_alignment: "LEFT"` | 表セル見出しの中央揃え（§2 表のデザイン）を本ルールが誤検出 → セル文脈は除外 |
| `A-LAYOUT-003` | §2 文字の位置 / 段落初め字下げなし | A | ERROR | `Paragraph.getIndentFirstLine() == 0`（または未設定） | rules.json: `first_line_indent_pt: 0` | namedStyles 継承未解決時の挙動 |
| `A-LAYOUT-004` | §2 フォント / 行間 1.15 | A | ERROR | `Paragraph.getLineSpacing() == 1.15` | rules.json: `line_spacing: 1.15`, `tolerance: 0.01` | 浮動小数誤差（1.15000001 等） |

#### 表記ゆれ（用語集）

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TEXT-001` | §2 表記ゆれ防止ルール / です・ます調統一 | B | WARN | LLM プロンプト: 文末述語の「だ・である」混在を検出。引用・条文抜粋は除外 | rules.json (LLM プロンプト) + 用語集スプレッドシート | 条文抜粋の「である」混在を誤検出 |
| `B-TEXT-002` | §2 表記ゆれ防止ルール / 英数字半角 | B | WARN | 用語集スプレッドシート参照。決定論寄りだがバリエーション網羅のため Layer B として LLM プロンプトで例外列を渡す（または辞書ベース手前の決定論前段を Layer A 化検討） | 校正用ルール・用語集 | 固有名詞の慣用表記（例: ＡＩ→AI の強制が誤判定になる例） |
| `B-TEXT-003` | §2 表記ゆれ防止ルール / 用語の統一 | B | WARN | 用語集スプレッドシートの「正/誤」対照表を LLM に渡し、文脈考慮で置換候補を提示 | 校正用ルール・用語集 | 同綴り異義語の文脈無視置換 |

#### 配色・アクセシビリティ

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-COLOR-001` | §2 配色 / 基本文字色 #000000 | A | ERROR | 全 Run の `getForegroundColor() == "#000000"`（強調用以外）。強調背景中の文字や見出しは別ルール | rules.json: `default_text_color: "#000000"` | namedStyles 継承未解決で空値の場合。リンク文字色は Doc 既定の青を許容するか要確認 |
| `A-COLOR-002` | §2 配色 / ミントグリーン #64d8c6 文字色不使用 | A | ERROR | 全 Run の `getForegroundColor()` が `#64d8c6`（および近傍 ±2 程度のバリエーション）と一致 | rules.json: `forbidden_text_colors: ["#64d8c6"]` | 表ヘッダ等の意図的使用箇所は別文脈。本ルールは本文文字色を対象 |
| `A-COLOR-003` | §2 配色 / 強調背景は #b4f2e8 のみ可 | A | ERROR | 全 Run の `getBackgroundColor()` が `null`（背景なし）または `#b4f2e8` 以外を検出 | rules.json: `allowed_highlight_colors: [null, "#b4f2e8"]` | 表セル背景（#666666 等）と Run 背景の API 区別。本ルールは Run.getBackgroundColor() のみ対象 |
| `A-COLOR-004` | §2 配色 / コントラスト比（WCAG） | A | ERROR | WCAG 2.x 相対輝度→比率の固定式で前景色×背景色を計算。本文は 4.5:1 以上、大型テキスト（18pt 以上 or 14pt 太字以上）は 3:1 以上 | rules.json: `contrast_threshold_normal: 4.5`, `contrast_threshold_large: 3.0` | 背景色 null（既定白）の解決、表セル背景と Run 背景の重ね合わせ |
| `A-EMPHASIS-001` | §2 配色 / 強調比率 ≦ 1割 | A | ERROR | 全 Run のうち「太字 or 背景 `#b4f2e8`」を装飾と定義し、装飾文字数 / 総文字数 ≦ 0.1 | rules.json: `emphasis_ratio_max: 0.1`, `emphasis_definition: ["bold", "highlight_b4f2e8"]` | 見出し文字を装飾文字数に含めるか除外するか。本ルールは本文段落のみ対象とし、見出しは除外（仕様明確化必要） |
| `B-EMPHASIS-001` | §2 配色 / 強調は文章で表現 | B | WARN | Layer A が検出した強調箇所を LLM に渡し「文章で言い換え可能だったか」を判定 | rules.json (LLM プロンプト) | 文章言い換え不能な固有名詞や数値の強調を誤検出 |
| `A-CHARS-001` | §2 配色 / 絵文字・機種依存文字 | A | ERROR | Unicode 範囲で絵文字（Emoji_Presentation, Extended_Pictographic）および丸数字等の機種依存文字を検出。GUIDELINES 内の `⭕️ ❌` 等の例示記号は本マニュアル本文では検出（例示記号自体の使用を許容するか要確認） | rules.json: `forbidden_unicode_ranges: [...]`, `allowed_symbols: ["⭕", "❌"]` | NFC 正規化前後で異なる結果。サロゲートペア処理 |

#### 表のデザイン

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-TABLE-001` | §2 表のデザイン / 見出し行 文字 #ffffff・背景 #666666 | A | ERROR | `Table.getRow(0)` 各 Cell の `getBackgroundColor() == "#666666"` かつ Cell 内 Run の `getForegroundColor() == "#ffffff"` | rules.json: `table_header_row: {bg:"#666666", fg:"#ffffff"}` | ヘッダ行を持たない表での誤検出（先頭行をヘッダと仮定する設計は要検討） |
| `A-TABLE-002` | §2 表のデザイン / 見出し列 文字 #000000・背景 #666666 | A | ERROR | 各 Row の左端 Cell の `getBackgroundColor() == "#666666"` かつ Cell 内 Run の `getForegroundColor() == "#000000"` | rules.json: `table_header_col: {bg:"#666666", fg:"#000000"}` | GUIDELINES の指定通り（黒文字 + #666666 背景）はコントラスト比 5.7:1 で WCAG AA 通過。`A-COLOR-004` との衝突なし |
| `A-TABLE-003` | §2 表のデザイン / 罫線 色 #ffffff・1pt | A | ERROR | `Table.getBorderColor()`（GAS API 制約あり）または各 Cell の罫線スタイルを `documents.get` 経由で取得し、`color == #ffffff` かつ `width == 1pt` | rules.json: `table_border: {color:"#ffffff", width_pt:1}` | DocumentApp の罫線取得 API 制約。Advanced Docs Service（`Docs.Documents.get`）で `tableCellStyle.borderXxx` を取得する必要あり |

#### 著作権・肖像権

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `OUT-COPYRIGHT-001` | §2 著作権・肖像権 / 写真・イラスト無断転載禁止 | OUT | INFO | 機械判定不可（画像出所判定不可）。「画像 N 枚検出。出所目視確認必須」と INFO で出す | なし | — |
| `OUT-COPYRIGHT-002` | §2 著作権・肖像権 / 引用要件（主従・出所・無改変） | OUT | INFO | 機械判定不可。引用と思しき箇所の近傍に「出典」「引用」キーワードがあるかの参考表示に留める | なし | — |
| `OUT-COPYRIGHT-003` | §2 著作権・肖像権 / 通行人の顔写り込み | OUT | INFO | 画像内容判定不可。「画像 N 枚検出。写り込み目視確認必須」と INFO | なし | — |

#### 作成後の確認

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TEXT-004` | §2 作成後の確認 / 誤字脱字 | B | WARN | LLM プロンプト: 形態素ベースで誤字候補を抽出。用語集と突き合わせ | rules.json (LLM プロンプト) + 校正用ルール・用語集 | 固有名詞・新語の過剰検出 |
| `A-LINK-001` | §2 作成後の確認 / リンク抽出（URL 形式） | A | ERROR | `Document` 全 Run の `getLinkUrl()` 非 null を列挙。URL 形式（RFC 3986 簡易）の妥当性を判定。到達性は別 | rules.json: `url_pattern: "^https?://..."` | 内部リンク（同 Doc 内ジャンプ）の扱い |
| `OUT-LINK-001` | §2 作成後の確認 / リンク到達性 | OUT | INFO | `UrlFetchApp.fetch()` で HEAD/GET 検証は技術的に可能だが、（a）外部 URL への過剰アクセスとなる懸念、（b）認証必須ページや bot ブロック、（c）GUIDELINES.md 内の参考 URL 群の検証コスト。レポートでは「リンク N 件抽出。到達性は別ツールで」と INFO 出力 | なし | — |
| `A-META-002` | §2 作成後の確認 / 作成日・更新日記載 | A | ERROR | 本文末尾近傍に「作成日: YYYY-MM-DD」「更新日: YYYY-MM-DD」または「YYYY年MM月DD日作成」等のパターンを正規表現で検出 | rules.json: `date_patterns: [...]` | 本文中の日付（イベント開催日等）を誤検出 → 末尾 N 段落のみ走査する仕様で抑制 |
| `B-TEXT-005` | §2 作成後の確認 / 読みにくさ・わかりにくさ | B | WARN | LLM プロンプト: 段落単位で読みやすさを 3 段階評価、改善提案 | rules.json (LLM プロンプト) | 専門領域での必要冗長を過剰指摘 |

### §3 わかりやすさの確保

#### 文章の基本

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TEXT-006` | §3 文章の基本 / 1文1トピック | B | WARN | LLM プロンプト: 1 文に複数主題が含まれるか判定 | rules.json (LLM プロンプト) | 並列箇条書きの 1 文を多トピックと誤判定 |
| `B-TEXT-007` | §3 文章の基本 / 1文 50字推奨・100字最大 | B | WARN | LLM プロンプト前に決定論で文長カウント可能だが、文の切り出し（句点・改行・括弧）に意味判断を要するため Layer B 寄り。ただし「100 字超」の硬閾値は Layer A 候補（要検討） | rules.json: `sentence_len_recommend: 50, max: 100` | 引用文・条文の長文を誤検出 |
| `A-TEXT-001` | §3 文章の基本 / 読点 1文3つまで | A | ERROR | 句点（。）または改行で区切った 1 文内の読点（、）を数え、`> 3` を検出。引用・条文は除外 | rules.json: `commas_per_sentence_max: 3` | 並列列挙の必要読点を誤検出 |
| `A-TEXT-002` | §3 文章の基本 / 漢字連続 6字以下 | A | ERROR | 連続する CJK 漢字の文字数を計測し `> 6` を検出 | rules.json: `kanji_run_max: 6` | 固有名詞（人名・地名・組織名）の長い漢字列を誤検出 → 用語集の固有名詞辞書で除外 |
| `B-TEXT-008` | §3 文章の基本 / 長文回避・箇条書き推奨 | B | WARN | LLM プロンプト: 段落内連続文数や箇条書き化推奨を判定 | rules.json (LLM プロンプト) | — |

#### 全体の構成

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `OUT-STRUCT-001` | §3 全体の構成 / 前編 2 ページ A4 印刷 | OUT | INFO | `documents.get` ではレンダリング後ページ数を得られない。Drive PDF エクスポート併用で将来検討（DESIGN.md §6） | なし | — |
| `B-STRUCT-001` | §3 全体の構成 / 流れ 概要→準備→活動→注意点 | B | WARN | LLM プロンプト: 見出し階層を抽出し、章立ての論理順序を判定。前編/後編構成も評価 | rules.json (LLM プロンプト) | 全体が短く前後編不要な場合の誤検出 |

#### 文法と係り受け

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TEXT-009` | §3 文法と係り受け / 格助詞省略しない | B | WARN | LLM プロンプト: 「は・が・を・に」省略の検出 | rules.json (LLM プロンプト) | 体言止め・キャッチコピー的表現を誤検出 |
| `B-TEXT-010` | §3 文法と係り受け / ら抜き言葉禁止 | B | WARN | LLM プロンプト + 辞書（食べれる→食べられる等）。決定論寄りだが活用形判定で Layer B | rules.json (LLM プロンプト) + 用語集 | 方言・引用の意図的「ら抜き」を誤検出 |
| `B-TEXT-011` | §3 文法と係り受け / 助詞「が」連続使用回避 | B | WARN | LLM プロンプト: 1 文内「が」複数出現の文脈評価 | rules.json (LLM プロンプト) | 主格と接続助詞「が」の区別 |
| `B-TEXT-012` | §3 文法と係り受け / 修飾被修飾の近接 | B | WARN | LLM プロンプト: 修飾語と被修飾語の距離・曖昧性を判定 | rules.json (LLM プロンプト) | — |

#### 表現の簡潔化・明確化

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `B-TEXT-013` | §3 表現の簡潔化 / 冗長表現（〜することができる等） | B | WARN | 辞書ベース検出 + LLM 文脈評価。辞書: `"することができる"`, `"〜の場合がある"`, `"〜していく"` 等 | rules.json (冗長表現辞書 + LLM プロンプト) | 文脈上必要な冗長を誤検出 |
| `B-TEXT-014` | §3 表現の簡潔化 / 能動態使用・受動態回避 | B | WARN | LLM プロンプト: 受動態文の検出と能動態提案 | rules.json (LLM プロンプト) | 受動態が自然な文（被害描写等）の誤検出 |
| `B-TEXT-015` | §3 表現の簡潔化 / 二重否定禁止 | B | WARN | LLM プロンプト + 辞書（「〜なくない」「〜しないわけではない」） | rules.json (二重否定パターン + LLM プロンプト) | 修辞的二重否定の意図的使用 |
| `B-TEXT-016` | §3 表現の簡潔化 / 曖昧副詞回避（適宜・適切に・しばらく・丁寧に等） | B | WARN | 辞書ベース検出 + LLM 文脈評価 | rules.json (曖昧副詞辞書 + LLM プロンプト) | 法令用語としての「適宜」等の引用 |
| `B-TEXT-017` | §3 表現の簡潔化 / 解決志向のメッセージ | B | WARN | LLM プロンプト: 注意書きで「問題のみ提示」「解決策提示なし」を検出 | rules.json (LLM プロンプト) | — |

#### 情報設計

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `OUT-LAYOUT-001` | §3 情報設計 / 近接の原則 | OUT | INFO | レイアウト視覚的判定は GAS から不可。「図表 N 件検出。説明文との近接は目視確認」と INFO | なし | — |
| `B-TEXT-018` | §3 情報設計 / 図表の補足説明 | B | WARN | 画像・表の直後/直前段落にキャプションらしき短文があるか LLM で判定 | rules.json (LLM プロンプト) | キャプション位置の慣習差 |

### §4 法令

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `OUT-LEGAL-001` | §4 法令全般 | OUT | INFO | 機械判定不可。ガイドライン自身が「法令は必ず目視確認」と明記（DESIGN.md §6）。レポートで「法令関連記述検出。校正チーム目視必須」を必ず出す | なし | — |

### §5 参考URL

| ルール ID | ガイドライン参照 | Layer | 重大度 | 判定方法 | 参照正本 | 想定誤検出パターン |
|---|---|---|---|---|---|---|
| `A-LINK-002` | §5 参考URL / URL 形式の妥当性 | A | ERROR | `A-LINK-001` と同じ抽出ロジックで参考 URL 節も含めて URL 形式チェック | rules.json: `url_pattern` | — |

## 集計

| Layer | 件数 |
|---|---|
| A（決定論・GAS） | 26 |
| B（LLM 意味判定） | 23 |
| OUT（自動化対象外） | 9 |
| 合計 | 58 |

Layer A は DESIGN.md §3 で想定される「強制可能項目の概ね8割」に対し、本マトリクスでは件数比 26/(26+23) ≒ 53%（OUT を除外した自動化対象比）にとどまる。これは「わかりやすさ」§3 が多くを意味判定（Layer B）に依存するため。**書式・配色・構造系は Layer A で網羅できている**ことが本マトリクスの主目的で、その点では充足。

## Layer A 実装優先度（次の rules.json / GAS 雛形で扱う範囲）

優先度の高い順（人間レビュー負荷が高く、機械化のリターンが大きい順）:

1. `A-COLOR-001`〜`A-COLOR-004`, `A-EMPHASIS-001`, `A-CHARS-001`（配色・装飾系）
2. `A-FONT-001`〜`A-FONT-007`（フォント階層）
3. `A-LAYOUT-001`〜`A-LAYOUT-004`（余白・行間・揃え・字下げ）
4. `A-TABLE-001`〜`A-TABLE-003`（表）
5. `A-META-001`, `A-META-002`, `A-LINK-001`, `A-LINK-002`（メタ・リンク）
6. `A-TEXT-001`, `A-TEXT-002`（読点・漢字連続：決定論可能な文章ルール）

[rules.json](rules.json) と `gas/handlers/*.gs` はこの順序で骨格を起こす。
