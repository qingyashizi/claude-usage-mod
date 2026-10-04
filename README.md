# claude-usage-mod

> 仓库名是 `claude-usage-mod`;插件名是 `usage-mod`(Anthropic 不允许第三方插件名以 `claude-` 开头)。

**中文** | [English](README.en.md)

Claude Code 用量显示 Mod:在输入框上方常驻显示**上下文占用、5 小时额度、每周额度**和重置时间,并带一个一键压缩上下文的按钮。

![usage-mod 截图:输入框上方的三块用量条和左边的压缩按钮](plugins/usage-mod/docs/screenshot.png)

支持简体中文、繁體中文、English、日本語。详细说明见 [plugins/usage-mod](plugins/usage-mod/README.md)。

## 安装

需要 **Claude Code 2.1.287 或更高版本**(`claude --version` 查看)。

```bash
claude plugin marketplace add qingyashizi/claude-usage-mod
claude plugin install usage-mod@usage-mod
```

已经打开的会话里运行 `/reload-plugins` 加载,否则下次启动生效。更新:

```bash
claude plugin marketplace update usage-mod
```

## 安装前请先看

Mod 是以你的权限运行的代码,没有沙箱。装之前可以先把仓库克隆下来,用下面的命令看它会做什么:

```bash
claude plugin validate ./plugins/usage-mod
```

输出里的 `hooks:` 和 `calls:` 两行,就是它挂了哪些事件、调用了哪些能力。本 Mod 不联网,只读写自己文件夹下的一个缓存文件。

## 许可证

MIT。
