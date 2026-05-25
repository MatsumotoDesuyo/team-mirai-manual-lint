---
name: layer-b-lint
description: チームみらいマニュアル Doc に対して Layer B（LLM 意味判定）チェックを実行する。受動態・冗長表現・トーン・用語ゆれなどガイドラインの「わかりやすさ」「トーン」系を判定し、Layer A（GAS）と同じ Finding 形式で出力する。引数として Google Docs の URL または ID を受け取る。
---

# Layer B Lint Skill

[team-mirai-manual-lint](https://github.com/MatsumotoDesuyo/team-mirai-manual-lint) の **Layer B（LLM 意味判定）** を、Claude Code 経由で実行するための skill。Anthropic API への個別課金を回避し、担当者の Claude Code 契約で運用する（[DESIGN.md §4.B](../../../DESIGN.md) 配布方式の skill 版）。

## 起動

ユーザーから以下のいずれかの形で起動される:

- `/layer-b-lint <Doc URL>`
- `/layer-b-lint <Doc ID>`

引数が空または欠落している場合は、Doc URL を確認する。

## 実行手順

### Step 1: 基準ドキュメントの読み込み

判定基準を確認するため、以下を必ず参照する:

- リポジトリ直下の [GUIDELINES.md](../../../GUIDELINES.md) — マニュアル作成ガイドライン本体（正本）
- リポジトリ直下の [rules.json](../../../rules.json) — `layer === "B"` の行に対象ルール定義
- [DESIGN.md](../../../DESIGN.md) §3 Layer B / §6 自動化しない領域

`rules.json` を読み込み、`layer === "B"` のルール一覧を抽出する。

### Step 2: Doc 取得

Google Drive MCP の `read_file_content` ツールを使い、与えられた Doc URL/ID から本文を取得。

URL からの ID 抽出:
- `https://docs.google.com/document/d/<DOC_ID>/edit` → `<DOC_ID>`

### Step 3: ルールごとに判定

[prompts/](./prompts/) 配下に各ルール用のプロンプト定義がある。**本実装済みのルールのみ判定する**:

| ルール ID | プロンプトファイル | 状態 |
|---|---|---|
| B-TEXT-004 | [prompts/typo.md](./prompts/typo.md) | ✅ 本実装 |
| B-TEXT-005 | [prompts/readability.md](./prompts/readability.md) | ✅ 本実装 |
| B-TEXT-006 | [prompts/sentence-one-topic.md](./prompts/sentence-one-topic.md) | ✅ 本実装 |
| B-TEXT-007 | [prompts/sentence-length.md](./prompts/sentence-length.md) | ✅ 本実装 |
| B-TEXT-008 | [prompts/prefer-bullets.md](./prompts/prefer-bullets.md) | ✅ 本実装 |
| B-TEXT-009 | [prompts/missing-particle.md](./prompts/missing-particle.md) | ✅ 本実装 |
| B-TEXT-010 | [prompts/ranuki.md](./prompts/ranuki.md) | ✅ 本実装 |
| B-TEXT-011 | [prompts/ga-consecutive.md](./prompts/ga-consecutive.md) | ✅ 本実装 |
| B-TEXT-012 | [prompts/modifier-proximity.md](./prompts/modifier-proximity.md) | ✅ 本実装 |
| B-TEXT-013 | [prompts/verbose-expression.md](./prompts/verbose-expression.md) | ✅ 本実装 |
| B-TEXT-014 | [prompts/passive-voice.md](./prompts/passive-voice.md) | ✅ 本実装 |
| B-TEXT-015 | [prompts/double-negation.md](./prompts/double-negation.md) | ✅ 本実装 |
| B-TEXT-016 | [prompts/ambiguous-adverb.md](./prompts/ambiguous-adverb.md) | ✅ 本実装 |
| B-TEXT-017 | [prompts/solution-oriented.md](./prompts/solution-oriented.md) | ✅ 本実装 |
| B-TEXT-018 | [prompts/figure-caption.md](./prompts/figure-caption.md) | ✅ 本実装 |
| B-TONE-001 | [prompts/values-alignment.md](./prompts/values-alignment.md) | ✅ 本実装 |
| B-TONE-002 | [prompts/tone-balance.md](./prompts/tone-balance.md) | ✅ 本実装 |
| B-TONE-003 | [prompts/reader-perspective.md](./prompts/reader-perspective.md) | ✅ 本実装 |
| B-EMPHASIS-001 | [prompts/emphasis-as-text.md](./prompts/emphasis-as-text.md) | ✅ 本実装 |
| B-STRUCT-001 | [prompts/chapter-structure.md](./prompts/chapter-structure.md) | ✅ 本実装 |

上記以外の `rules.json` Layer B 行（**B-TEXT-001 です・ます調統一 / B-TEXT-002 英数字半角統一 / B-TEXT-003 用語統一**）は **校正用ルール・用語集スプレッドシート連携待ちのため未対応**。誤った判定を生成しない。

各ルールについて、対応するプロンプトファイルの「判定手順」「除外基準」「出力形式」に従って Doc を解析する。

### Step 4: 結果の出力

#### 既定: 対話的に結果を提示

人間が読みやすい形でサマリを示す。各 Finding について:

- ルール ID とガイドライン参照
- 該当箇所（段落番号 + 抜粋）
- 違反内容と理由
- 改善案（プロンプトで指示されている場合）

#### JSON 出力（ユーザーが「JSON で」と指定した場合）

[Layer A](../../../gas/) の Finding 形式と互換のあるキー構成で出力:

```json
{
  "meta": {
    "skill": "layer-b-lint",
    "doc_id": "...",
    "rules_evaluated": ["B-TEXT-014"],
    "rules_not_implemented": ["B-TEXT-001", "..."]
  },
  "findings": [
    {
      "ruleId": "B-TEXT-014",
      "severity": "WARN",
      "guidelineRef": "§3 表現の簡潔化 / 能動態使用・受動態回避",
      "location": { "type": "paragraph", "index": 5, "hint": "段落 6" },
      "snippet": "...",
      "message": "...",
      "suggestion": "..."
    }
  ]
}
```

## 禁止事項（迎合せず守る）

- **判定基準の自己拡張禁止**: [GUIDELINES.md](../../../GUIDELINES.md) / [rules.json](../../../rules.json) に書かれていないルールを勝手に追加しない
- **法令・著作権・肖像権の判定禁止**: これらは [DESIGN.md §6](../../../DESIGN.md) で「人間専管（Layer C）」と定義されている。機械結果として出さない
- **Doc 本文の改変禁止**: Drive MCP の read 系のみ使用。書き込み・コメント挿入は行わない（[[feedback-no-doc-pollution]]）
- **未実装ルールの推測判定禁止**: prompts/ にプロンプトが無いルールは「未対応」と明示

## 関連

- [DESIGN.md §3 Layer B](../../../DESIGN.md)
- [rules.json](../../../rules.json)
- [GUIDELINES.md](../../../GUIDELINES.md)
- [cli/](../../../cli/) — 同じプロンプトを共有する CLI 版（API キー直接運用・CI 連携用）
