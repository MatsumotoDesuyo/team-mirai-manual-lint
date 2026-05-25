---
name: update-guidelines
description: チームみらい「マニュアル作成ガイドライン」原本（Google Docs）の更新を取り込み、ローカル GUIDELINES.md を上書きする。差分提示・影響範囲分析（rules.json / プロンプト / GAS ハンドラへの影響）・コミットメッセージ案も含む。`--check` で差分のみ確認可能。
---

# Update Guidelines Skill

team-mirai-manual-lint の判定基準であるチームみらい「マニュアル作成ガイドライン」は **Google Docs が原本** で、リポジトリには [GUIDELINES.md](../../../GUIDELINES.md) としてローカルキャッシュを保持している（[CLAUDE.md](../../../CLAUDE.md)「ガイドラインの参照と更新」参照）。

原本側に変更があった時、本 skill で取り込み作業を半自動化する。**ガイドライン本体だけを更新し、rules.json / プロンプト / GAS ハンドラの修正は影響範囲分析のみ提示**（実装は別タスク）。

## 起動

- `/update-guidelines` — 取得・差分提示・上書き承認まで実行
- `/update-guidelines --check` — 差分確認のみ。上書きはしない

## 対象

- 原本: Google Docs ファイル ID `1ht9fGSHIf0zjiV7INp7JvnCCZHwoJYMCdOB-VkokO1c`
- ローカル: [GUIDELINES.md](../../../GUIDELINES.md)

## 実行手順

### Step 1: 原本取得

Google Drive MCP の `read_file_content`（または `get_file_metadata` + `download_file_content`）で上記ファイル ID を取得。

- `modified_time`（Drive 上の最終更新日時）を取得
- 本文を取得

### Step 2: 既存 GUIDELINES.md の読み込み

リポジトリの GUIDELINES.md を読み込み、フロントマターと本文を分離。
フロントマターの `modified_time` / `fetched_at` を記録。

### Step 3: 差分判定

本文を比較し、以下のいずれかに分類:

- **変更なし**: ローカルと原本が完全一致。何もしない（フロントマターの `fetched_at` も更新しない）
- **軽微変更**: 誤字・改行・空白等のみ。意味判定に影響しない
- **実質変更**: 文言が変わっており、判定ロジックに影響する可能性がある

差分は git diff 風に表示する（`---` / `+++` / `@@` ハンク）。長い場合は章節ごとに要約。

### Step 4: 影響範囲分析

実質変更がある場合、以下を変更箇所ごとに分析して提示:

#### 影響範囲マップ

| 章節 | 変更時の主な影響先 |
|---|---|
| §1 考え方 | `.claude/skills/layer-b-lint/prompts/values-alignment.md` / `tone-balance.md` / `reader-perspective.md` |
| §2 デザインルール | `rules.json` の A-LAYOUT-*, A-FONT-*, A-COLOR-*, A-EMPHASIS-*, A-TABLE-*, A-META-* / 対応する `gas/handlers/` |
| §2 表記ゆれ防止ルール | `.claude/skills/layer-b-lint/prompts/desu-masu-style.md` / `halfwidth-alphanum.md` / `term-consistency.md` ※ 用語集スプレッドシート本体ではない |
| §3 文章の基本 | `prompts/sentence-one-topic.md` / `sentence-length.md` / `missing-particle.md` 等 |
| §3 文法と係り受け | `prompts/ranuki.md` / `ga-consecutive.md` / `modifier-proximity.md` |
| §3 表現の簡潔化 | `prompts/verbose-expression.md` / `passive-voice.md` / `double-negation.md` / `ambiguous-adverb.md` / `solution-oriented.md` |
| §3 情報設計 | `prompts/figure-caption.md` |
| §3 全体の構成 | `prompts/chapter-structure.md` |
| §4 法令 | **基本的に機械判定対象外（Layer C）**。`rules.json` の `OUT-LEGAL-001` は変更不要が原則 |
| §5 参考URL | リンク先のみの更新は通常 `rules.json` に影響なし |

各変更ごとに:
- **影響度**: `HIGH`（ルール改廃に直結） / `MEDIUM`（プロンプト調整推奨） / `LOW`（参考のみ、コード変更不要）
- **要対応ファイル**: 上記マップから関連ファイルパスを列挙
- **対応の概要**: 何を直すかの 1〜2 行サマリ

### Step 5: 上書き承認

ユーザーに上書きの承認を求める:

- 「以下の差分で GUIDELINES.md を上書きしますか？ (yes/no)」
- `--check` モードならここで終了

### Step 6: GUIDELINES.md 上書き

承認後、GUIDELINES.md を上書き。フロントマターを以下の通り更新:

```yaml
---
source: https://docs.google.com/document/d/1ht9fGSHIf0zjiV7INp7JvnCCZHwoJYMCdOB-VkokO1c/edit
file_id: 1ht9fGSHIf0zjiV7INp7JvnCCZHwoJYMCdOB-VkokO1c
title: 街頭演説マニュアル作成ガイドライン
modified_time: <Drive 側の最終更新日時を ISO8601 形式で>
fetched_at: <今日の日付を YYYY-MM-DD 形式で>
note: Google Drive MCP `read_file_content` の出力をほぼ原文のまま保存。更新手順は CLAUDE.md「ガイドラインの参照と更新」を参照。
---
```

### Step 7: git 状態の確認とコミット案

書き込み後、ローカル `git diff GUIDELINES.md` を確認するよう案内（実行はユーザー）。

コミットメッセージ案を提示:

```
ガイドライン更新（Drive: YYYY-MM-DD 更新分）

主な変更:
- §X.X の <章節名>: <変更内容の要約>
- ...

影響範囲（別タスクで対応）:
- HIGH: <ファイルパス> — <対応概要>
- MEDIUM: <ファイルパス> — <対応概要>
```

**コミットの実行はユーザー判断**。本 skill は実行しない。

## 禁止事項

- **ユーザー承認なしの上書き禁止**: Step 5 を飛ばさない
- **rules.json / プロンプト / コードへの変更禁止**: 本 skill は GUIDELINES.md 更新と影響範囲分析までで、実装変更は別タスク
- **法令節（§4）の言い換え禁止**: 法令文言は原文ママを保持（[DESIGN.md §6](../../../DESIGN.md) 参照）
- **frontmatter の捏造禁止**: `modified_time` は Drive API で取得した正確な値、`fetched_at` は実行日。推測値を入れない
- **`git commit` の自動実行禁止**: コミット可否はユーザー判断

## 関連

- [CLAUDE.md](../../../CLAUDE.md)「ガイドラインの参照と更新」
- [DESIGN.md](../../../DESIGN.md) §6 自動化しない領域
- [GUIDELINES.md](../../../GUIDELINES.md) ローカルキャッシュ
- [rules-matrix.md](../../../rules-matrix.md) 章節 → ルール ID 対応表
- [rules.json](../../../rules.json) ルール定義
- [.claude/skills/layer-b-lint/](../layer-b-lint/) Layer B プロンプト群
