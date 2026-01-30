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

## 必要環境

- Node.js 18以上
- Rust（Tauriビルド用）
- Windows 10/11

## 開発

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run tauri dev
```

## ビルド

```bash
# 本番ビルド
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成されます。

- `nsis/mynote_x.x.x_x64-setup.exe` - インストーラー（推奨）
- `msi/mynote_x.x.x_x64_en-US.msi` - MSIパッケージ

## 技術スタック

- **フロントエンド**: React, TypeScript, TipTap, @dnd-kit
- **バックエンド**: Tauri 2.0, Rust
- **データベース**: SQLite（tauri-plugin-sql）
- **ビルドツール**: Vite

## ライセンス

MIT
