# Gemini Model Table & Pets

[Gemini の Web 版](https://gemini.google.com/app)のモデル選択を周期表にし、Codex Pets の待機アニメーションをページの右下に表示する Chrome 拡張機能です。

## インストール

1. Chrome で `chrome://extensions` を開き、右上の **デベロッパー モード**をオンにします。
2. **パッケージ化されていない拡張機能を読み込む**を押し、`manifest.json` があるこのフォルダを選びます。
3. Gemini のタブを再読み込みします。

## モデルの周期表

Gemini の入力欄にあるモデル名を押すと、周期表が開きます。Hydrogen（H）、Carbon（C）、Neon（Ne）、Argon（Ar）のうち、アカウントの標準メニューに表示されるモデルが色付きになります。ロック中のモデルは無効表示になります。セルを選ぶと Gemini のモデルが切り替わり、そのモデルに思考レベルがある場合は詳細欄に表示されます。**標準メニュー**で元の操作に切り替えられます。

## Codex Pets

拡張機能アイコンから **ファイルを選択**を押し、Codex Pets の PNG または WebP スプライトシートを開きます。読み込むと Gemini の右下に表示され、同じ画面の **Gemini に表示**で切り替えられます。

- デスクトップアプリで作ったカスタムペットは、そのペットのフォルダにあるスプライトシートを使います。ChatGPT の Web 版にアップロードしたペットは、ペット設定から画像をダウンロードできます。[ChatGPT のペット設定](https://learn.chatgpt.com/docs/pets)
- 標準ペットの Codex も読み込めます。[Codex のスプライトシートを開く](https://cdn.openai.com/c6d7b0d0-3abf-40b5-9d0c-ecd2b9364692/codex-spritesheet-v4.webp)
- スプライトシートは 1536 × 1872（v1）または 1536 × 2288（v2）に対応します。待機アニメーションの 6 コマと表示設定を、この Chrome プロファイルに保存します。
