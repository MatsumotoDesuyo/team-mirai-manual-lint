# team-mirai-manual-lint CLI (Layer B)

[DESIGN.md](../DESIGN.md) §3 Layer B（LLM 意味判定）の **CI / 非 Claude Code 環境向け** 実装。

> **通常は [`/layer-b-lint` skill](../.claude/skills/layer-b-lint/SKILL.md) を推奨します。** Claude Code 経由なら Anthropic API への個別課金が発生しないため、コスト面で有利です。
> 本 CLI は次のいずれかに該当する場合に使用してください:
> - GitHub Actions など **CI で自動実行** したい
> - 担当者が **Claude Code を契約していない** が Anthropic API キーは持っている
> - **再現性が厳格に必要**（同一プロンプトで同一モデル指定）

判定プロンプトは skill と共通の [.claude/skills/layer-b-lint/prompts/](../.claude/skills/layer-b-lint/prompts/) を参照します。運用経路によって判定がブレないようにする設計です。

各サポーターが個別に CLI セットアップする必要はありません。校正チームに渡す前段で 1 回実行する想定（[DESIGN.md §3 Layer B](../DESIGN.md)）。

## セットアップ

### 前提
- Node.js 18 以上

### 1. 依存パッケージのインストール

```bash
cd cli
npm install
```

### 2. Anthropic API キーの取得

[Anthropic Console](https://console.anthropic.com/) でアカウント作成し、API キーを発行。

### 3. Google OAuth credentials.json の取得

Doc を読み取るために Google Docs API への認証が必要。

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクトを作成（既存でも可）
2. 「API とサービス → ライブラリ」で **Google Docs API** を有効化
3. 「認証情報 → 認証情報を作成 → OAuth クライアント ID」を選択
4. アプリケーションの種類: **デスクトップ アプリ**
5. 作成後にダウンロードできる JSON を `cli/credentials.json` として保存

### 4. 環境変数の設定

```bash
cp .env.example .env
```

`.env` を編集して `ANTHROPIC_API_KEY` を設定。モデルは既定 `claude-sonnet-4-6`（コスト効率と精度のバランス）。

### 5. OAuth 認証

```bash
npm run auth
```

ブラウザが開いて Google アカウントでログイン → スコープ承認 → `token.json` がローカル保存される。

## 使い方

```bash
# JSON で stdout 出力
npm run lint -- --doc-url "https://docs.google.com/document/d/<DOC_ID>/edit"

# Markdown でファイル出力
npm run lint -- --doc-url "<URL>" --format md --output report.md

# Doc ID 直接指定
npm run lint -- --doc-id "1abc...XYZ"
```

出力には Layer B の Finding が並び、各 Finding には:
- `ruleId`: 例 `B-TEXT-014`
- `severity`: `WARN`（既定）
- `guidelineRef`: ガイドラインの章節
- `location.index`: 段落インデックス（[Layer A](../gas/) と同じ意味）
- `snippet`: 該当抜粋（30〜80 字程度）
- `message`: 違反内容
- `suggestion`: 改善案（ハンドラ次第）

## ルール実装状況

| ルール ID | 内容 | 状態 |
|---|---|---|
| **B-TEXT-014** | 受動態回避 | ✅ 本実装 |
| B-TEXT-001〜013, 015〜018 | です・ます調、誤字、文長、文法、冗長表現、二重否定、曖昧副詞 等 | 未実装（順次） |
| B-TONE-001〜003 | 価値観・トーン・読み手視点 | 未実装 |
| B-EMPHASIS-001 | 強調は文章で表現 | 未実装 |
| B-STRUCT-001 | 前編後編・章立て | 未実装 |

未実装ルールは「CLI ハンドラ未実装」の INFO Finding として出力される。実装は [src/handlers/](./src/handlers/) に追加。

## アーキテクチャ

- **入力**: Doc URL → Google Docs API で取得 → `paragraphs[]` に展開
- **プロンプトキャッシュ**: ガイドライン抜粋と Doc 全文を system 側に置き `cache_control: ephemeral` を指定。各ルール（最大 23 個）で system は同じ → 2 ルール目以降はキャッシュヒット → 入力トークンコストを大幅削減
- **ルールごとの判定**: 各ハンドラが個別の判定指示（user メッセージ）を投げ、JSON で結果を受け取る
- **出力**: Layer A と同じ `findings[]` 形式

## トラブルシュート

| 症状 | 原因 / 対処 |
|---|---|
| `OAuth トークンが見つかりません` | `npm run auth` を実行していない。または `GOOGLE_TOKEN_PATH` のパスが間違っている |
| `refresh_token が取得できませんでした` | OAuth Client が「ウェブアプリ」になっている。「デスクトップ アプリ」で作り直し |
| `ANTHROPIC_API_KEY が未設定です` | `.env` に `ANTHROPIC_API_KEY=sk-ant-...` を設定 |
| `LLM 出力の JSON パース失敗` | プロンプトが指示通り JSON を返していない。`DEBUG=1` で stack trace を確認 |
| Doc API で 403 / 404 | 該当 Doc に対する閲覧権限がない。OAuth ユーザーで該当 Doc を一度ブラウザで開いて確認 |
