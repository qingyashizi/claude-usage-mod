# claude-usage-mod

> 儲存庫名稱是 `claude-usage-mod`;外掛名稱是 `usage-mod`(Anthropic 不允許第三方外掛名稱以 `claude-` 開頭)。

[English](README.md) | [简体中文](README.zh-CN.md) | **繁體中文** | [日本語](README.ja.md)

Claude Code 用量顯示 Mod:在輸入框上方常駐顯示**上下文佔用、5 小時額度、每週額度**和重置時間,附帶一個一鍵壓縮上下文的按鈕,還能點最右邊的圖示展開**每一輪回覆的 token 用量折線圖**(快取命中 / 快取建立 / 新增輸入 / 輸出,滑鼠移上去可看每一輪的開始、結束時間和耗時)。

![usage-mod 截圖:輸入框上方的三塊用量條,兩端各有一個圖示按鈕](plugins/usage-mod/docs/screenshot-bar-en.png)

點最右邊的圖示展開 token 明細折線圖:

![usage-mod 截圖:展開後的 token 明細折線圖](plugins/usage-mod/docs/screenshot-chart-en.png)

(截圖是英文介面。)支援簡體中文、繁體中文、English、日本語,預設跟隨電腦的語言(簡體中文、繁體中文、日語以外一律顯示英文)。詳細說明見 [plugins/usage-mod](plugins/usage-mod/README.zh-TW.md)。

## 安裝

需要 **Claude Code 2.1.287 或更高版本**(用 `claude --version` 查看)。

**以下指令請在終端機裡執行**,不是輸入到 Claude Code 的對話框。終端機可以是系統內建的 PowerShell、Windows Terminal(macOS / Linux 用內建的終端機),或桌面應用程式側邊的 Terminal 面板。

```bash
claude plugin marketplace add qingyashizi/claude-usage-mod
claude plugin install usage-mod@usage-mod
```

- 第一行:告訴 Claude Code,把 GitHub 上的 `qingyashizi/claude-usage-mod`(格式是 `使用者名稱/儲存庫名稱`)登記成一個「外掛市集」,也就是一份可以從中挑選外掛的清單。這一步只是登記,**還沒有安裝任何東西**。
- 第二行:從剛登記的市集安裝外掛。`usage-mod@usage-mod` 的格式是 `外掛名稱@市集名稱`,這裡兩個名稱碰巧一樣:前一個是外掛,後一個是市集。

已經開啟的工作階段裡執行 `/reload-plugins` 載入,否則下次啟動時生效。更新:

```bash
claude plugin marketplace update usage-mod
```

## 安裝前請先看

Mod 是以你的權限執行的程式碼,沒有沙箱。安裝前可以先把儲存庫複製下來,用下面的指令看它會做什麼:

```bash
claude plugin validate ./plugins/usage-mod
```

輸出裡的 `hooks:` 和 `calls:` 兩行,就是它掛了哪些事件、呼叫了哪些能力。本 Mod 不連網,只讀寫自己資料夾下的一個快取檔案。

## 解除安裝

同樣在終端機裡執行:

```bash
claude plugin uninstall usage-mod@usage-mod
claude plugin marketplace remove usage-mod   # 可選:把加入過的市集也移除
```

只想暫時關掉:`claude plugin disable usage-mod@usage-mod`。更多見 [plugins/usage-mod](plugins/usage-mod/README.zh-TW.md)。

## 授權

MIT。
