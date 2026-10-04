# claude-usage-mod

> リポジトリ名は `claude-usage-mod`、プラグイン名は `usage-mod` です(Anthropic はサードパーティ製プラグインの名前が `claude-` で始まることを認めていません)。

[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | **日本語**

Claude Code 用の使用量表示 Mod です。入力欄の上に **コンテキストの使用量・5時間枠・週間枠** とリセット時刻を常時表示し、ワンクリックでコンテキストを圧縮するボタンも付いています。右端のアイコンを押すと、**各応答のトークン使用量の折れ線グラフ**(キャッシュ読取 / キャッシュ作成 / 新規入力 / 出力。マウスを重ねると各ターンの開始・終了時刻と所要時間を表示)が開きます。

![usage-mod のスクリーンショット:入力欄の上に 3 つの使用量バー、両端にアイコンボタン](plugins/usage-mod/docs/screenshot-bar-en.png)

右端のアイコンを押すと、トークン内訳の折れ線グラフが開きます:

![usage-mod のスクリーンショット:展開したトークン内訳グラフ](plugins/usage-mod/docs/screenshot-chart-en.png)

(スクリーンショットは英語表示です。)表示言語は簡体字中国語・繁体字中国語・English・日本語に対応し、既定ではパソコンの言語に合わせます(簡体字中国語・繁体字中国語・日本語以外は英語になります)。詳しくは [plugins/usage-mod](plugins/usage-mod/README.ja.md) を参照してください。

## インストール

**Claude Code 2.1.287 以降**が必要です(`claude --version` で確認できます)。

**以下のコマンドはターミナルで実行してください。** Claude Code のチャット欄に入力するものではありません。ターミナルは、PowerShell や Windows Terminal(macOS / Linux では標準のターミナル)、またはデスクトップアプリの会話の横にある Terminal パネルのいずれでも構いません。

```bash
claude plugin marketplace add qingyashizi/claude-usage-mod
claude plugin install usage-mod@usage-mod
```

- 1 行目:GitHub の `qingyashizi/claude-usage-mod`(形式は `ユーザー名/リポジトリ名`)を「プラグインマーケットプレイス」、つまりプラグインを選べる一覧として Claude Code に登録します。登録するだけで、**まだ何もインストールされません**。
- 2 行目:いま登録したマーケットプレイスからプラグインをインストールします。`usage-mod@usage-mod` は `プラグイン名@マーケットプレイス名` の形式で、ここでは偶然どちらも同じ名前です。前がプラグイン、後ろがマーケットプレイスです。

すでに開いているセッションでは `/reload-plugins` を実行して読み込みます。そうでなければ次回の起動時に有効になります。更新するには:

```bash
claude plugin marketplace update usage-mod
```

## インストール前にお読みください

Mod はあなたの権限で動くコードで、サンドボックスはありません。インストール前にリポジトリをクローンして、次のコマンドで何をするか確認できます:

```bash
claude plugin validate ./plugins/usage-mod
```

出力の `hooks:` と `calls:` の 2 行が、どのイベントに反応し、どの機能を呼び出すかを示します。この Mod はネットワークに接続せず、自分のフォルダ内のキャッシュファイル 1 つを読み書きするだけです。

## アンインストール

こちらもターミナルで実行します:

```bash
claude plugin uninstall usage-mod@usage-mod
claude plugin marketplace remove usage-mod   # 任意:追加したマーケットプレイスも削除
```

一時的に無効にするだけなら `claude plugin disable usage-mod@usage-mod` です。詳しくは [plugins/usage-mod](plugins/usage-mod/README.ja.md) を参照してください。

## ライセンス

MIT。
