# トラブルシュート

team-mirai-manual-lint を使っていて起きる症状と対処をまとめます。本ドキュメントは「これまでに実際に踏んだ罠」を集約したもので、新しい罠を踏んだら順次追加してください。

## Layer A（GAS / サイドバー）

### 「マニュアルチェック」メニューが表示されない

**症状**: Doc を開いてもメニューバーに「マニュアルチェック」が出ない。

**原因**:
- `onOpen` が走るタイミングが遅い、または失敗している
- loader.gs が保存されていない
- Doc を「コピー作成」した直後で、まだ Apps Script の権限承認が済んでいない

**対処**:
1. Doc のブラウザを **再読込（F5）**
2. それでも出なければ、拡張機能 → Apps Script を開いて関数 `onOpen` を選び「実行」を 1 回押す（手動実行で OAuth フローが起動）
3. Apps Script エディタで `Code.gs` が空になっていないか確認。空ならテンプレート Doc が壊れているので [docs/setup-template-doc.md](setup-template-doc.md) Step 3 から再貼り付け

---

### 「指定された権限では Ui.showSidebar を呼び出すことができません」

**症状**: 「マニュアルチェック → チェック実行」でエラーダイアログ:
```
エラー: 指定された権限では Ui.showSidebar を呼び出すことができません。
必要な権限: https://www.googleapis.com/auth/script.container.ui
```

**原因**: loader.gs が古いバージョン（`showSidebar` 呼び出しがリモート eval ロード側にあった旧版）。Apps Script の OAuth スコープ自動推測がリモート eval 経路では効かないため、必要なスコープが要求されない（[[project-gas-remote-loader-constraints]]）。

**対処**:
1. 最新の loader.gs を再貼り付け: <https://raw.githubusercontent.com/MatsumotoDesuyo/team-mirai-manual-lint/main/gas/loader.gs>
2. 保存して Doc 再読込
3. 「マニュアルチェック → チェック実行」を再実行。新スコープの承認画面が出るので「許可」

---

### 「Docs is not defined」または見出しスタイル系・色系・表系の Finding がすべて「未実装（雛形）」

**症状**: サイドバーに以下のような Finding が大量に出る:
```
[A-FONT-002] § 2 見出しレベル / タイトル 21pt 太字
  位置: 未実装（雛形）
  実装方針: Advanced Docs Service が無効。Apps Script エディタで「サービス → Google Docs API」を追加してください
```

**原因**: Apps Script の **Advanced Docs Service (Google Docs API)** が有効化されていない。テンプレート Doc 作成時に Step 4 がスキップされた、または個別の Doc で別途有効化が必要なケース。

**対処**:
1. Apps Script エディタを開く
2. 左サイドバー「サービス」（鎖アイコン）→「サービスを追加」→「Google Docs API」
3. 識別子 `Docs` で「追加」
4. 保存 → Doc 再読込 → 「マニュアルチェック → チェック実行」

詳細は [docs/setup-template-doc.md Step 4](setup-template-doc.md) 参照。

---

### 検出結果が古いまま変わらない（プッシュしたコードが反映されない）

**症状**: GitHub にコード変更をプッシュしたのに、Apps Script から実行すると古い検出結果のまま。

**原因**: **GitHub raw の Fastly CDN キャッシュ**。push 後、CDN キャッシュが 5 分前後残ることがある（[[project-repo-owner]]）。

**対処**:
1. **5 分待ってから再実行** — 一番確実
2. すぐに反映させたい場合は loader.gs に既に組み込まれているキャッシュバスター（`?cb=Date.now()`）で多くは回避できるが、CDN 側の挙動次第なので保証はない
3. それでも変わらない場合、別の問題（コード自体の bug、ハンドラ未登録等）の可能性。raw を直接ブラウザで開いて、コード内容が最新になっているか確認

---

### サイドバーが開かず、`alert` だけが出る

**症状**: 「チェック完了: N 件の指摘を…」のような alert は出るが、サイドバーが開かない。

**原因**: loader.gs が **サイドバー導入前の古い版**。

**対処**: 最新の loader.gs を再貼り付け。詳細は「Ui.showSidebar を呼び出せません」の項目と同じ。

---

### 箇条書きが大量に「字下げ違反」として誤検出される

**症状**: A-LAYOUT-003（段落初め字下げなし）で 30〜50 件もの ERROR が出る。すべて箇条書きの行。

**原因**: 過去のバージョンで ListItem（箇条書き）のネスト深度由来インデントを「字下げ」と誤判定していた。**現在は修正済み**。

**対処**: 最新の `gas/lib/docwalk.gs` および `gas/handlers/layout.gs` が取得できているか確認。CDN キャッシュ問題の可能性もあるので 5 分待って再実行。

---

### 「マニュアルチェック → チェック実行」で何も起きない・スピナーが永遠に回る

**症状**: ボタンを押しても反応がない、または「実行中」のままサイドバーが開かない。

**原因**:
- `UrlFetchApp` が GitHub からの取得で時間がかかっている（数十秒）
- GitHub 側で raw URL が一時的にダウンしている
- Apps Script の実行クォータに達した

**対処**:
1. **1〜2 分待つ** — 初回実行や大きな Doc では時間がかかる
2. それでもダメなら、Apps Script エディタで「実行ログ」を確認（メニュー「実行 → 実行履歴」）
3. `UrlFetchApp` 失敗が出ている場合、GitHub raw URL を直接ブラウザで開いて到達確認

---

## Layer B（skill / CLI）

### `/layer-b-lint` が補完候補に出ない

**症状**: Claude Code で `/` を打っても `layer-b-lint` が出ない。

**原因**:
- Claude Code がプロジェクト直下の `.claude/skills/` を読み込んでいない
- リポジトリを開く前のセッションで skill が認識されていない

**対処**:
1. Claude Code を一度終了 → リポジトリディレクトリを開いて再起動
2. または、新しいセッションを `cd c:\Projects\team-mirai-manual-lint` 配下で起動

---

### skill 経由で「Drive MCP が接続されていない」エラー

**症状**: `/layer-b-lint` 実行時に Google Drive MCP のツールが見つからない。

**原因**: Google Drive MCP が Claude Code に接続されていない。

**対処**:
1. Claude Code の設定で Google Drive MCP を有効化
2. MCP の OAuth フローを完了
3. `claude.ai_Google_Drive` という MCP サーバーが接続済みであることを確認

---

### CLI で「OAuth トークンが見つかりません」

**症状**: `npm run lint` で以下のエラー:
```
OAuth トークンが見つかりません: ./token.json
初回セットアップでは `npm run auth` を先に実行してください。
```

**対処**: `cli/` ディレクトリで `npm run auth` を 1 回実行。ブラウザで Google ログイン → スコープ承認 → `token.json` 生成。

---

### CLI で「`refresh_token` が取得できませんでした」

**症状**: `npm run auth` 実行中にこのエラー。

**原因**: Google Cloud Console で OAuth Client を作るとき、種類を「ウェブ アプリケーション」にしてしまった。

**対処**: Google Cloud Console で OAuth Client を「**デスクトップ アプリ**」として作り直して、`cli/credentials.json` を差し替えてから再度 `npm run auth`。

---

### CLI で B-TEXT-001/002/003 が「用語集未取得のため判定見送り」になる

**症状**: 用語集連携が必要な 3 ルールだけ INFO Finding として「用語集未取得のため判定見送り」が出る。

**原因**:
- Google Cloud Console で **Google Sheets API が有効化されていない**
- OAuth スコープに `spreadsheets.readonly` が含まれていない（古い `token.json`）
- 用語集スプレッドシート（ID: `1YhKZ48Cyel-_zq8Jcj580w0wViUE7KMX1u-651IEdp0`）に閲覧権限がない

**対処**:
1. Google Cloud Console で **Google Sheets API** を有効化
2. `cli/` で `npm run auth` を再実行（スコープ追加のため）
3. それでもダメなら、用語集スプレッドシートの所有者に共有依頼

---

## update-guidelines skill

### `/update-guidelines` で原本取得に失敗

**症状**: skill が「Doc 取得失敗」または「権限なし」を返す。

**原因**: Google Drive MCP に対するアカウント認証で、ガイドライン原本 Doc への閲覧権限がない。

**対処**: Drive 上で原本 Doc（ID: `1ht9fGSHIf0zjiV7INp7JvnCCZHwoJYMCdOB-VkokO1c`）を一度ブラウザで開いて、閲覧できるか確認。アクセス権限がなければチームみらい関係者に共有依頼。

---

## loader.gs を再貼り付けすべきタイミング

「変更したら loader を再貼り付けすべきか」の判断基準:

| 変更箇所 | loader 再貼り付け要 |
|---|:-:|
| `gas/handlers/*.gs` の中身 | ❌ 不要（リモート配信） |
| `gas/lib/*.gs` の中身 | ❌ 不要 |
| `gas/report.gs` / `gas/checker.gs` の中身 | ❌ 不要 |
| `gas/sidebar.html` の中身 | ❌ 不要 |
| `rules.json` の中身 | ❌ 不要 |
| **`gas/loader.gs` 自体の中身** | ✅ **必要** |
| TM_LINT_CONFIG.files への追加（手元コードの参照変更） | ✅ 必要（loader.gs 内なので） |
| 新しい OAuth スコープが要求されるような API 呼び出しを loader に追加 | ✅ 必要（静的スコープ推測のため） |

迷ったら再貼り付けする方が安全です（壊れない、3 分の作業）。

---

## 関連メモリ

このプロジェクトに固有の知見はメモリにも記録されています:

- `feedback-no-doc-pollution`: Doc 本文を汚さない方針
- `project-gas-remote-loader-constraints`: リモートローダ方式の OAuth スコープ制約
- `project-repo-owner`: リポジトリ owner と CDN キャッシュ問題

メモリは `C:\Users\otomu\.claude\projects\c--Projects-team-mirai-manual-lint\memory\` 配下に保存されています。
