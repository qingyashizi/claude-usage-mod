# usage-mod

**English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md)

A small mod for Claude Code. It shows three usage figures in a row above the prompt, adds a one-click button to compact the context, and can expand a line chart of the token usage of every reply.

![usage-mod screenshot: three usage bars above the prompt, with an icon button at each end](docs/screenshot-bar-en.png)

Left to right: the compact button, context usage, the 5-hour limit, the weekly limit, and the details button. Click the icon on the far right to expand the token chart above the row (see "Token chart" below); click again to collapse it.

## Features

- **Context usage**: percent used and the token count.
- **5-hour limit**: percent used, time until reset, and the exact reset time.
- **Weekly limit**: the same.
- **One-click compact**: the line icon on the far left (four arrows pointing inward). One click compacts the context right away, the same as typing `/compact`. A tooltip appears on hover.
- **Token details**: the chart icon on the far right. One click expands a line chart of the token usage of every reply above the row; click again to collapse. See "Token chart" below.
- Three equal-width blocks. The orange (`#D77757`) fill shows how much is used; the color is fixed and does not change with usage.
- A toast appears once when a figure reaches 90%.
- Figures refresh every 5 seconds, so you don't have to wait for a reply to finish.

## Token chart

Click the chart icon on the far right of the row to expand it, and again to collapse it.

![usage-mod screenshot: the expanded token chart](docs/screenshot-chart-en.png)

From top to bottom the expanded panel has:

- **First row**: a title, five totals and the number of turns. The totals add up every reply the mod has recorded in this session:
  - **Fresh input**: input tokens that were sent to the model fresh, not served from the cache.
  - **Output**: tokens the model generated.
  - **Cache write**: tokens newly written to the prompt cache.
  - **Cache read**: tokens read from the prompt cache, which is much cheaper than fresh input.
  - **Cache hit rate**: cache read ÷ (fresh input + cache write + cache read).
- **Second row**: a toggle for each of the four lines; click a name in the legend to show or hide that line. Cache read is usually orders of magnitude larger than the others, which flattens them against the axis; hide it and the rest become readable.
- **The chart**: one point per reply, in time order (the earliest and latest times are labelled at the bottom corners), with token counts on the vertical axis. It keeps the last 50 turns.
- **Hover a turn**: its column lights up and a semi-transparent card appears beside it with the start time → end time, how long it took, the model, and the four figures for that turn. Replies from sub-agents are marked after the model name.

Things to know:

- The data comes from **the current session only**, and only from replies **after the mod was loaded**. It starts over after a restart or `/reload-plugins`, and is not saved to a file.
- "Took" is wall-clock time, including any time it sat waiting for you: step away for an hour and that turn shows over an hour. The start time is worked out as "end time − duration".
- The chart exists only where an image can be drawn (the Desktop app). In the terminal the expand button only shows the totals, with no chart.
- The card jumps from column to column; it does not follow the pointer smoothly. These charts cannot run scripts, so the mod never learns the exact pointer position.
- The chart may flicker now and then while it is open: a chart that reacts to hover has to be drawn in its own small frame, and that frame is rebuilt every time the row redraws (for example while figures change during a reply). To flicker less, the once-a-minute countdown refresh is paused while the panel is open and catches up when you close it.
- When the window is too narrow for the first row, things give way in order: the title, then the turn count moves to the second row, then the cache hit rate and fresh input are dropped from the totals. Text lengths differ a lot between the four languages, so this is worked out from the actual text width in the current language.
- It does not show "what percent of the 5-hour limit each turn used": the engine only reports whole percents, and the limit is shared by the whole account (other sessions and the web app count too), so subtracting between turns would be meaningless.
- The line icons on the buttons are from [Lucide](https://lucide.dev) (ISC license).

## Language

Simplified Chinese (`zh`), Traditional Chinese (`zh-TW`), English (`en`) and Japanese (`ja`).

By default (`auto`) it follows the computer's language: Simplified Chinese on a Simplified Chinese system, Traditional Chinese (Taiwan, Hong Kong, Macau) on a Traditional one, Japanese on a Japanese one, and English for everything else.

To pin one language, run `/plugin` in Claude Code, find usage-mod and change **Language / 语言**. Or set it in `~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "usage-mod": { "options": { "language": "en" } }
  }
}
```

The mod reloads itself after the change. `auto`, no setting, or an unknown language code all follow the computer's language. (When installed from a marketplace, use the key name that `/plugin` shows for `pluginConfigs`; changing it in `/plugin` directly is the safest way.)

To add another language, open `hooks/i18n.ts`, copy a dictionary and translate it, register it in `DICTS`, then add the language code to `userConfig.language.options` in `.claude-plugin/plugin.json`.

## Requirements

Mods need **Claude Code 2.1.287 or later**, where they are on by default. Check with `claude --version`.

This mod was developed on 2.1.286. On 2.1.286 and earlier you also need the environment variable `CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1` (see "Load it manually" below). From 2.1.287 on, that variable is ignored and not needed.

## Install

### Option 1: from the marketplace

**Run these commands in a terminal**, not by typing them into the Claude Code chat box. Any terminal works: PowerShell or Windows Terminal (Terminal on macOS / Linux), or the Terminal panel beside the conversation in the Desktop app.

```bash
claude plugin marketplace add qingyashizi/claude-usage-mod
claude plugin install usage-mod@usage-mod
```

- First line: tells Claude Code to register the GitHub repository `qingyashizi/claude-usage-mod` (the format is `user/repo`) as a "plugin marketplace", a list it can pick plugins from. This only registers it; **nothing is installed yet**.
- Second line: installs the plugin from the marketplace you just added. `usage-mod@usage-mod` has the form `plugin@marketplace`; the two names happen to be the same here: the first is the plugin, the second is the marketplace.

In a session that is already open, run `/reload-plugins` to load it; otherwise it loads the next time you start Claude Code.

### Option 2: load it manually

Put the whole `usage-mod` folder somewhere you like, for example `~/.claude/mods/usage-mod`.

**Try it for one run** (only for that launch):

```bash
claude --plugin-dir ~/.claude/mods/usage-mod
```

**Keep it permanently**: add an `env` block to `~/.claude/settings.json` with your own path. New sessions pick it up.

```json
{
  "env": {
    "CLAUDE_CODE_PLUGIN_DIRS": "C:\\Users\\your-name\\.claude\\mods\\usage-mod"
  }
}
```

On 2.1.286 and earlier, also add `"CLAUDE_CODE_ENABLE_FUNCTION_HOOKS": "1"` to `env`. To reload automatically when you edit the code, also add `"CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"`.

### See what it does before you install it

A mod is code that runs inside Claude Code with your permissions, and it is not sandboxed. Before installing, list which events it handles and what it asks Claude Code to do:

```bash
claude plugin validate ./usage-mod
```

The `hooks:` and `calls:` lines in the output are the answer. This mod uses: reading usage (`$.session.usage`), noting the usage of each reply when it finishes (the `turn.complete` event; read-only, kept in memory only), running the `/compact` command to compact the context (`$.command.run`), reading and writing `cache/limits.json` inside its own folder (`$.fs.read` / `$.fs.write`), toasts (`$.ui.toast`) and timers (`$.clock`). It makes no network requests and reads no other files.

### Where it runs

- `claude` in a terminal: the row and the compact button show; **the token chart does not** (images cannot be drawn in a terminal), and the expand button falls back to a text symbol that opens only the totals.
- The Code tab of the Desktop app: the row, both buttons and the chart all show (plugins are not available in WSL sessions).
- The VS Code extension, `claude -p`, and cloud sessions: the mod runs, but the row is not drawn.

## Customize

Colors, icons and the chart style are constants at the top of `hooks/register.tsx`; all displayed text (including the hover tooltip, `tip`) is in `hooks/i18n.ts`:

| Constant | What it does |
|---|---|
| `ORANGE` | Fill color of the used part |
| `WARM` | Background color of the unused part |
| `DARK` / `LIGHT` | Text color inside / outside the fill |
| `ICON_PATHS` | The two buttons' line icons (Lucide shape data); swap the shapes to change an icon |
| `ICON_BG` / `ICON_LINE` | Icon background (must match the row's background) and line color |
| `ICON` | The text symbol the compact button uses where no image can be drawn (the terminal) |
| `SERIES` | Colors of the chart's four lines |
| `CARD` / `GRID` / `MUTED` | The chart's background, grid lines and axis text |
| `TIP_BG` | Background of the hover details card |
| `MAX_TURNS` | How many turns to keep, 50 by default |
| `WARN` | Percentage that triggers the warning toast, 90 by default |

## Known limitations

- **The mods API is in early access** and changes between Claude Code versions. This mod was developed and tested on 2.1.286; other versions may fail to load it or draw it differently.
- **Switching to a session that has not been opened since the app started, the row takes a few seconds to appear.** Measured in the Desktop app on Claude Code 2.1.289 (about ten runs): 2.5 to 5.5 seconds, around 4 on average; going back to a session that is already open is instant. Almost all of that time is spent inside the engine, which a mod cannot affect: about 1 second from the mod loading until its start hook runs, then about 1.7 seconds from the hook finishing until the row is first drawn. The mod's own setup is a fraction of a second. Making that setup non-blocking changed nothing measurable (4.3 s vs 4.0 s on average, within the run-to-run spread).
- **The 5-hour and weekly figures only have real values after this process has received one reply.** A new session first shows the figures saved last time (in `cache/limits.json` inside the mod folder); any whose reset time has passed are dropped and shown as "—". This follows from how the engine supplies the data.
- **The padding above and below the row belongs to the app**, and a mod cannot change it.
- In the Desktop app the hover tooltip is drawn by the app as a dark card, so its text is light; in the terminal it is dark text on orange.
- When the window is narrower than 78 columns, the row falls back to one short line, with neither button, so the chart cannot be expanded.
- The chart width is estimated from the number of columns in the row (an image only accepts a width in pixels, and the engine does not tell a mod how many pixels the row has). Too large and the app shrinks the whole image, which shows a strip of background; too small and the side margins grow. At other font sizes you may need to adjust `CHART_PX_PER_CELL`.
- Compacting replaces the earlier conversation with a summary, so detail is lost. **A click runs it immediately, with no confirmation step.**
- **Compacting waits for the model to summarize the conversation, which takes a while when the context is large.** Measured: about 63 seconds at roughly 410k tokens. A click first shows "Compacting context…", then "Context compacted" when done; there is no progress display in between, and clicking again does not help.
- Sessions in the Desktop app are SDK (headless) sessions, where the engine does not let a mod call the compaction API (`$.session.compact`) directly, so the button runs the `/compact` command for you instead (`$.command.run`). This was only verified in the Desktop app; it has not been tried in the terminal.
- Clicking while Claude is replying: per the engine docs the command is queued and runs once the turn ends. This has not been verified here.
- The author has only tested loading with `--plugin-dir` and `CLAUDE_CODE_PLUGIN_DIRS`. Installing from a marketplace is written from the official documentation and has not been tried first-hand.

## Uninstall

**Installed from the marketplace** (also run in a terminal):

```bash
claude plugin uninstall usage-mod@usage-mod
```

Run `/reload-plugins` in an open session, or it takes effect on the next start. You can also run `/plugin` inside Claude Code and manage usage-mod from the list. To switch it off for now and keep it for later, use `claude plugin disable usage-mod@usage-mod` (and `enable` to bring it back).

To remove the marketplace you added as well:

```bash
claude plugin marketplace remove usage-mod
```

**Loaded manually:** remove the `CLAUDE_CODE_PLUGIN_DIRS` entry from `settings.json` (or change the path) and delete the folder.

If you changed the language, `settings.json` may still hold a `usage-mod` entry under `pluginConfigs`. It does no harm; delete it by hand if you want a clean file.

## License

MIT. See `LICENSE`.
