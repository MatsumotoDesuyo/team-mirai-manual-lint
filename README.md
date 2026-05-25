# team-mirai-manual-lint

チームみらい街頭活動マニュアル（Google Docs）が、チームみらい「マニュアル作成ガイドライン」に適合しているかを機械的にチェックするツール群。

> **本ツールは個人サポーターによる非公式のコミュニティツールです。チームみらい公式のものではありません。**
> 公開・配布の責任は個人サポーターに帰属します。法令・著作権・肖像権・トーンの最終判断は校正チームによる人間レビューが必須です。

## できること

機械で確実に潰せる項目を前段フィルタし、人間レビュー（校正チーム）が判断項目に集中できる状態を作ります。

| 層 | 担当 | 範囲 |
|---|---|---|
| **Layer A** | GAS（[gas/](gas/)） | 余白・行間・字下げ・フォント・色・コントラスト比・強調比率・絵文字検出・表スタイル・ページ番号・作成日記載・URL 形式・読点数・漢字連続 — 決定論で答えが一意に決まるもの |
| **Layer B** | LLM CLI（[cli/](cli/)） | 一文長・受動態・二重否定・曖昧副詞・トーン・用語統一 — 意味判断を要するもの。Anthropic Claude API + Node.js |
| **Layer C** | 人間（校正チーム） | 法令・著作権・肖像権・画像内容・改ページ後レイアウト — 機械判定対象外 |

詳細は [DESIGN.md](DESIGN.md) と [rules-matrix.md](rules-matrix.md) を参照。

## 導入手順（Layer A / Google Docs）

本ツールは **Google Workspace Marketplace の Add-on ではありません**。テンプレート Doc をコピーするだけで導入が完了します。

1. 配布されたテンプレート Doc を開き、メニュー「ファイル → コピーを作成」で自分のドライブに複製します。
2. コピーした Doc を開き、上部メニューの「マニュアルチェック → 取得元の確認」を押して、コードの取得元（本リポジトリの raw URL）を確認します。
3. 内容に問題がなければ「マニュアルチェック → チェック実行」を押します。初回のみ Google から権限承認のダイアログが表示されるので承認します。
4. Doc 末尾に構造化レポートが追記されます。`ERROR` から優先して修正してください。

### 仕組み（透明性）

テンプレート Doc に含まれるスクリプトは [gas/loader.gs](gas/loader.gs) の薄いローダのみです。実行時に `UrlFetchApp` で本リポジトリの `main` ブランチから [rules.json](rules.json) と `gas/` 配下の各 `.gs` を取得し、ローダ内で評価して実行します。

- コードとルールは公開リポジトリで常に監査可能です。
- テンプレートを毎回更新する必要はなく、本リポジトリ側の更新が自動で全コピー Doc に反映されます（ドリフト断の設計）。
- 取得元 URL とブランチ参照は実行ごとにレポート末尾に明示します。

外部 URL からコードを取得して実行する点に懸念がある場合は、`gas/loader.gs` の `TM_LINT_CONFIG.ref` を特定タグ／コミット SHA に固定してください。

## 導入手順（Layer B / LLM 意味判定）

Layer B は **LLM 担当者が手元で実行する** 別経路です。各サポーターのインストールは不要で、校正チームに渡す前段で 1 回実行する設計です（DESIGN.md §4.B）。

担当者の運用環境に応じて 2 経路を提供しています:

### 推奨: Claude Code skill 経由

担当者が Claude Code（Pro/Max 等）を契約しているなら、こちらが第 1 選択肢。**Anthropic API への個別課金が発生しません**。

1. このリポジトリを Claude Code で開く
2. Google Drive MCP を有効化（接続済みなら不要）
3. `/layer-b-lint <Doc URL>` を実行
4. 結果が対話的に提示される。JSON が欲しい場合は「JSON で出して」と追記

skill 定義: [.claude/skills/layer-b-lint/SKILL.md](.claude/skills/layer-b-lint/SKILL.md)
プロンプト本体: [.claude/skills/layer-b-lint/prompts/](.claude/skills/layer-b-lint/prompts/)（CLI と共有）

### 補助: CLI 経由

CI / GitHub Actions 連携が必要、または非 Claude Code 環境の担当者が実行する場合に使う選択肢。Anthropic API キーを直接消費します。

セットアップと使い方は [cli/README.md](cli/README.md) を参照。

### ルール実装状況

本実装済み: B-TEXT-014（受動態回避）の 1 ルール。残り 22 ルールは順次実装中。skill 側のプロンプト追加で CLI 側も自動的に対応します（プロンプト共有設計）。

## ファイル構成

```
team-mirai-manual-lint/
├── CLAUDE.md               プロジェクト指示書（Claude Code 用）
├── DESIGN.md               意思決定ログ（アーキテクチャ・配布方式・却下案）
├── GUIDELINES.md           マニュアル作成ガイドラインのローカルキャッシュ
├── rules-matrix.md         判定マトリクス（ガイドライン全項目の Layer 仕分け）
├── rules.json              Layer A ルール定義（GAS が実行時に取得）
├── gas/
│   ├── loader.gs           テンプレート Doc に貼り付ける薄いローダ（onOpen / メニュー）
│   ├── checker.gs          ディスパッチャ
│   ├── report.gs           Doc 末尾に構造化レポートを出力
│   ├── lib/
│   │   ├── contrast.gs     WCAG 相対輝度・コントラスト比の固定式
│   │   └── docwalk.gs      namedStyles 継承解決済みの Doc 走査ユーティリティ
│   └── handlers/
│       ├── color.gs        A-COLOR-001〜004（文字色・背景色・コントラスト）
│       ├── font.gs         A-FONT-001〜007（フォントファミリ・サイズ階層）
│       ├── layout.gs       A-LAYOUT-001〜004（余白・揃え・字下げ・行間）
│       ├── emphasis.gs     A-EMPHASIS-001（強調比率）
│       ├── table.gs        A-TABLE-001〜003（表スタイル・罫線）
│       ├── chars.gs        A-CHARS-001（絵文字・機種依存文字）
│       ├── meta.gs         A-META-001〜002（フッターページ番号・作成日記載）
│       ├── link.gs         A-LINK-001〜002（URL 形式検査）
│       └── text.gs         A-TEXT-001〜002（読点数・漢字連続）
└── LICENSE
```

## 現在の状態

- **Layer A**: 全 26 ルール本実装完了。サイドバー UI 込みで実 Doc 動作確認済み
- **Layer B**: B-TEXT-014（受動態回避）の 1 ルールを本実装。CLI / プロンプトキャッシュの土台は完成。残り 22 ルールは順次実装
- **Layer C**: 機械対象外（仕様）

## 自動化しない領域（人間確認に委ねる）

[DESIGN.md §6](DESIGN.md) で明示しているとおり、以下は本ツールで判定しません。レポートには「人間確認 / 自動化対象外」タグで提示されます。

- 総ページ数・改ページ後のレイアウト
- 法令の正誤
- 画像の出所・許諾・通行人の写り込み
- 引用要件の充足判断

`ERROR` がゼロでも、校正チームによる目視確認は必ず通してください。

## 開発・貢献

判定基準であるガイドラインは Google Docs 上で運用されており、本リポジトリにはローカルキャッシュ [GUIDELINES.md](GUIDELINES.md) があります。ガイドラインの更新手順は [CLAUDE.md](CLAUDE.md)「ガイドラインの参照と更新」を参照してください。

設計判断や却下案については、新規提案・異論ともにまず [DESIGN.md](DESIGN.md) を読んでから議論してください。

## ライセンス

[LICENSE](LICENSE) を参照。
