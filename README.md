# team-mirai-manual-lint

チームみらい街頭活動マニュアル（Google Docs）が、チームみらい「マニュアル作成ガイドライン」に適合しているかを機械的にチェックするツール群。

> **本ツールは個人サポーターによる非公式のコミュニティツールです。チームみらい公式のものではありません。**
> 公開・配布の責任は個人サポーターに帰属します。法令・著作権・肖像権・最終トーン判断は校正チームによる人間レビューが必須です。

---

## アーキテクチャ

判定の決定性で 3 層に分割しています（詳細は [DESIGN.md](DESIGN.md)）。

| Layer | 担当 | 範囲 |
|---|---|---|
| **Layer A** | GAS（[gas/](gas/)） | 余白・行間・字下げ・フォント階層・色・コントラスト比・強調比率・絵文字検出・表スタイル・ページ番号・作成日記載・URL 形式・読点数・漢字連続 — **決定論で答えが一意に決まる 26 ルール** |
| **Layer B** | Claude Code skill（[.claude/skills/layer-b-lint/](.claude/skills/layer-b-lint/)）/ CLI（[cli/](cli/)） | 一文長・受動態・二重否定・曖昧副詞・トーン・読み手視点・用語統一・誤字脱字など — **意味判断を要する 23 ルール** |
| **Layer C** | 人間（校正チーム） | 法令・著作権・肖像権・画像内容・改ページ後レイアウト — **機械判定対象外** |

---

## Quick Start

利用者ごとに 3 つの導線があります。自分の役割に合うものから読んでください。

### 🧑 サポーター向け（マニュアルを書く立場）

3 ステップで Layer A チェッカーが使えます:

1. **テンプレート Doc を「コピーを作成」**: <TEMPLATE_DOC_COPY_URL>
2. コピーした Doc を開き、「**マニュアルチェック → チェック実行**」をメニューから選択
3. 初回は権限承認画面が出るので「許可」→ サイドバーに Layer A の Finding が並びます

詳しい使い方:
- サイドバーの各 Finding をクリックすると、本文の該当箇所が選択状態になります
- 「✓ 解決」ボタンで対応済みマークを付けられます（Doc には書き込まれない、ローカルストレージに保存）
- ERROR / WARN / INFO のフィルタで表示切替できます

うまく動かないとき → [docs/troubleshooting.md](docs/troubleshooting.md)

### 🤖 LLM 担当者向け（Layer B 判定の実行）

校正チームに渡す前段で、各 Doc に対して **Layer B（意味判定）** を 1 回実行します。

**推奨: Claude Code skill 経由**（API 個別課金が発生しません）

1. このリポジトリを Claude Code で開く
2. Google Drive MCP を有効化（接続済みなら不要）
3. `/layer-b-lint <Doc URL>` を実行
4. 23 ルールの判定結果が対話的に提示される。JSON が必要なら「JSON で」と追記

詳細: [.claude/skills/layer-b-lint/SKILL.md](.claude/skills/layer-b-lint/SKILL.md)

**補助: CLI 経由**（CI 自動化 / Claude Code 非契約者）

```bash
cd cli
npm install
npm run auth   # 初回のみ
npm run lint -- --doc-url "<Doc URL>" --format md --output report.md
```

セットアップ詳細: [cli/README.md](cli/README.md)

### 📝 校正チーム向け

サポーターから渡される Doc には以下が紐づいています:

- **サイドバー上の Layer A Finding**: Doc を開いて「マニュアルチェック → チェック実行」で再表示可能。書式・色・構造系の機械的違反 26 種
- **Layer B 判定結果**: LLM 担当者から別途渡される（チャット履歴 or Markdown / JSON ファイル）。意味判定系 23 種

これら 2 つを入力に、以下を判断するのが校正チームの役割です:

- **法令・著作権・肖像権**（Layer A / B 対象外、必ず目視）
- **トーンの最終判定**（Layer B の助言を参考に）
- **画像の出所・許諾**
- **改ページ後のレイアウト崩れ**

---

## ガイドライン更新の取り込み

判定基準であるガイドラインは Google Docs が原本で、リポジトリには [GUIDELINES.md](GUIDELINES.md) としてローカルキャッシュしています。

原本が更新されたときの取り込み手順:

```
/update-guidelines        — 差分提示・上書き承認まで
/update-guidelines --check — 差分のみ確認
```

詳細: [.claude/skills/update-guidelines/SKILL.md](.claude/skills/update-guidelines/SKILL.md)

---

## 機能一覧

### Layer A: GAS で自動判定（26 ルール、本実装完了）

[rules.json](rules.json) の `layer === "A"` 行を [gas/handlers/](gas/handlers/) が判定:

- **余白・行間・揃え・字下げ**（A-LAYOUT-001〜004）
- **フォントファミリ・サイズ階層**（A-FONT-001〜007、namedStyles 継承解決済み）
- **配色・コントラスト**（A-COLOR-001〜004、WCAG 固定式）
- **強調比率 ≦ 1割**（A-EMPHASIS-001）
- **絵文字・機種依存文字**（A-CHARS-001）
- **表スタイル・罫線**（A-TABLE-001〜003、Advanced Docs Service）
- **ページ番号・作成日記載・リンク URL 形式**（A-META-001/002, A-LINK-001/002）
- **読点数・漢字連続**（A-TEXT-001/002）

### Layer B: LLM で意味判定（23 ルール、本実装完了）

[rules.json](rules.json) の `layer === "B"` 行を skill / CLI が判定:

- **文章スタイル・文法**: 1 文 1 トピック / 一文長 / 格助詞省略 / ら抜き言葉 / 「が」連続 / 修飾被修飾近接（B-TEXT-006/007/009〜012）
- **表現の簡潔化**: 冗長表現 / 受動態回避 / 二重否定 / 曖昧副詞（B-TEXT-013/014/015/016）
- **読みやすさ・構成**: 誤字脱字 / 読みにくさ / 箇条書き推奨 / 解決志向 / 図表補足（B-TEXT-004/005/008/017/018）
- **トーン**: 価値観 / 文章のトーン / 読み手視点（B-TONE-001/002/003）
- **強調・構成**: 強調文章化 / 章立て（B-EMPHASIS-001, B-STRUCT-001）
- **用語集連携**: です・ます調 / 英数字半角 / 用語統一（B-TEXT-001/002/003）

### skill 2 種

- `/layer-b-lint <Doc URL>` — Layer B 判定
- `/update-guidelines [--check]` — ガイドライン更新取り込み

---

## 自動化しない領域（人間専管）

[DESIGN.md §6](DESIGN.md) で明示しているとおり、以下は機械判定対象外です:

- 法令の正誤（公職選挙法・道路交通法等）
- 著作権・肖像権・引用要件
- 画像の出所・許諾・通行人の写り込み
- 改ページ後ページ数・レイアウト
- 近接の原則（図表配置の視覚判定）

これらは校正チームによる目視確認が必須です。Layer A のサイドバーに **「人間確認領域」** として情報提示されますが、機械結果として「OK / NG」は出しません。

---

## テンプレート Doc の作成（ミッションオーナー専用）

サポーター向けの「コピーを作成」リンクを公開する手順:

→ [docs/setup-template-doc.md](docs/setup-template-doc.md)

---

## トラブルシュート

「サイドバーが開かない」「Docs is not defined」「検出結果が更新されない」など、過去に踏んだ罠と対処:

→ [docs/troubleshooting.md](docs/troubleshooting.md)

---

## 開発者向け

### 新しい Layer A ルールを追加する

1. [rules-matrix.md](rules-matrix.md) に新ルールの行を追加（ID 採番、判定方法、想定誤検出）
2. [rules.json](rules.json) にルール定義を追加（`layer: "A"`、`handler`、`params`、`message`）
3. [gas/handlers/](gas/handlers/) の対応カテゴリ `.gs` に handler 関数を `this.checkXxx = function...` で追加
4. raw キャッシュが効くので、push 後 5 分待ってから Doc で動作確認

### 新しい Layer B ルールを追加する

1. [rules-matrix.md](rules-matrix.md) に新ルールの行を追加
2. [.claude/skills/layer-b-lint/prompts/](.claude/skills/layer-b-lint/prompts/) に判定基準を `.md` で作成（既存ファイルの構造を踏襲: 該当ガイドライン / 判定手順 / 除外基準 / 出力フィールド / 件数上限）
3. [rules.json](rules.json) に Layer B 行を追加（`layer: "B"`、`handler: "llm.checkXxx"`、`message`）
4. [cli/src/handlers/text.js](cli/src/handlers/text.js) に `export const checkXxx = makeTextHandler('<filename>.md');` を追加
5. [cli/src/handlers/index.js](cli/src/handlers/index.js) に登録
6. [.claude/skills/layer-b-lint/SKILL.md](.claude/skills/layer-b-lint/SKILL.md) の対応表に追加

### ガイドラインを再取得する

`/update-guidelines` skill を使用。詳細は skill 内の手順を参照。

---

## ライセンス・問い合わせ

- ライセンス: [LICENSE](LICENSE)
- 本ツールに関する問い合わせは、リポジトリ owner（個人サポーター）へ
- チームみらい公式への問い合わせ先ではありません
