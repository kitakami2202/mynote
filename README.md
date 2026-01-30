# MyNote

OneNoteライクなノートアプリケーション。Tauri + React + TypeScriptで構築。

## 機能

- 階層構造のノート管理（ツリービュー）
- ドラッグ＆ドロップによるノートの並び替え
- リッチテキストエディタ（TipTap）
  - 太字、斜体、下線
  - 見出し（H1、H2、H3）
  - 箇条書き、番号付きリスト
  - 画像挿入
  - Tab/Shift+Tabでインデント調整
  - 行間調整
- SQLiteによるローカルデータ保存
- 自動保存
- アプリ内から手動で更新確認＆インストール

## インストール

[Releases](https://github.com/kitakami2202/mynote/releases) から最新のインストーラーをダウンロード：

- `MyNote_x.x.x_x64-setup.exe` - インストーラー（推奨）

## CLI ツール（開発者向け）

任意のプロジェクトから開発ログをMyNoteに記録できるCLIツール。

### インストール

```bash
cd cli
npm install
npm install -g .
```

### 使い方

```bash
# 開発メモを記録
mynote-log "機能Xを実装完了"

# プロジェクト名を指定
mynote-log "バグ修正" -p my-project

# 記録済みプロジェクト一覧
mynote-log list

# 設定確認
mynote-log init
```

記録されたメモはMyNoteの「開発ログ」→「プロジェクト名」に保存されます。

## 開発

### 必要環境

- Node.js 18以上
- Rust（Tauriビルド用）
- Windows 10/11

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run tauri dev
```

### ビルド

```bash
# 本番ビルド
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

### リリース

タグをプッシュするとGitHub Actionsで自動ビルド＆リリースされます：

```bash
git tag v0.2.0
git push origin v0.2.0
```

## 技術スタック

- **フロントエンド**: React, TypeScript, TipTap, @dnd-kit
- **バックエンド**: Tauri 2.0, Rust
- **データベース**: SQLite（tauri-plugin-sql）
- **ビルドツール**: Vite
- **CI/CD**: GitHub Actions

## ライセンス

MIT
