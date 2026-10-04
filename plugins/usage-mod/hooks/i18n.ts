// 所有显示出来的文字都在这里。想加一种语言:复制一份下面的词典,改成目标语言,
// 在 DICTS 里登记,再把语言代码加进 .claude-plugin/plugin.json 的 userConfig.language.options。

/** 把毫秒拆成时、分、秒,各语言的"用时"文字共用。 */
const split = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000))

  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

export type Dict = {
  /** 三块的名字,以及窄窗口时的简短写法 */
  ctx: string
  five: string
  week: string
  shortCtx: string
  shortFive: string
  shortWeek: string
  /** 弹提醒时用的窗口名 */
  fiveWindow: string
  weekWindow: string
  warn: (name: string, percent: number) => string
  /** 距离重置还有多久:按天+时、时+分、分三档 */
  inDays: (days: number, hours: number) => string
  inHours: (hours: number, mins: number) => string
  inMins: (mins: number) => string
  resetSoon: string
  /** 重置时刻:明天、一周内的星期几、更远的日期 */
  tomorrow: string
  weekday: (index: number) => string
  date: (month: number, day: number) => string
  /** 压缩按钮 */
  compacting: string
  compacted: string
  notCompacted: (reason: string) => string
  tip: string
  /** 悬停提示占的格数(中日文每字占两格) */
  tipCells: number
  /** token 明细按钮和面板 */
  statsTip: string
  statsTipCells: number
  statsTitle: string
  statsEmpty: string
  statsTurns: (n: number) => string
  sIn: string
  sOut: string
  sCreate: string
  sHit: string
  sRate: string
  sub: string
  statsAxis: (n: number) => string
  startLabel: string
  endLabel: string
  elapsed: (ms: number) => string
  chartDesktopOnly: string
  close: string
}

const zh: Dict = {
  ctx: '上下文',
  five: '5小时',
  week: '本周',
  shortCtx: '上下文',
  shortFive: '5时',
  shortWeek: '周',
  fiveWindow: '5 小时窗口',
  weekWindow: '每周窗口',
  warn: (name, percent) => `${name}已用 ${percent}%`,
  inDays: (d, h) => `${d}天${h}时后`,
  inHours: (h, m) => `${h}时${m}分后`,
  inMins: m => `${m}分后`,
  resetSoon: '即将重置',
  tomorrow: '明天',
  weekday: i => `周${'日一二三四五六'[i]}`,
  date: (m, d) => `${m}月${d}日`,
  compacting: '正在压缩上下文…(内容多时要一两分钟)',
  compacted: '已压缩上下文',
  notCompacted: reason => `没有压缩:${reason}`,
  tip: '点击压缩上下文',
  tipCells: 18,
  statsTip: '展开/收起 token 趋势',
  statsTipCells: 24,
  statsTitle: '本会话 token 明细',
  statsEmpty: '还没有记录。从装上这个 Mod 起,每轮回复结束时开始统计。',
  statsTurns: n => `共 ${n} 轮`,
  sIn: '新增输入',
  sOut: '输出',
  sCreate: '缓存创建',
  sHit: '缓存命中',
  sRate: '缓存命中率',
  sub: '子代理',
  statsAxis: n => `最近 ${n} 轮`,
  startLabel: '开始',
  endLabel: '结束',
  elapsed: ms => {
    const { h, m, s } = split(ms)

    return h > 0 ? `用时 ${h}小时${m}分` : m > 0 ? `用时 ${m}分${s}秒` : `用时 ${s}秒`
  },
  chartDesktopOnly: '折线图只在桌面应用里显示。',
  close: '关闭',
}

const zhTW: Dict = {
  ctx: '上下文',
  five: '5小時',
  week: '本週',
  shortCtx: '上下文',
  shortFive: '5時',
  shortWeek: '週',
  fiveWindow: '5 小時視窗',
  weekWindow: '每週視窗',
  warn: (name, percent) => `${name}已用 ${percent}%`,
  inDays: (d, h) => `${d}天${h}時後`,
  inHours: (h, m) => `${h}時${m}分後`,
  inMins: m => `${m}分後`,
  resetSoon: '即將重置',
  tomorrow: '明天',
  weekday: i => `週${'日一二三四五六'[i]}`,
  date: (m, d) => `${m}月${d}日`,
  compacting: '正在壓縮上下文…(內容多時要一兩分鐘)',
  compacted: '已壓縮上下文',
  notCompacted: reason => `沒有壓縮:${reason}`,
  tip: '點擊壓縮上下文',
  tipCells: 18,
  statsTip: '展開/收起 token 趨勢',
  statsTipCells: 24,
  statsTitle: '本會話 token 明細',
  statsEmpty: '還沒有記錄。從裝上這個 Mod 起,每輪回覆結束時開始統計。',
  statsTurns: n => `共 ${n} 輪`,
  sIn: '新增輸入',
  sOut: '輸出',
  sCreate: '快取建立',
  sHit: '快取命中',
  sRate: '快取命中率',
  sub: '子代理',
  statsAxis: n => `最近 ${n} 輪`,
  startLabel: '開始',
  endLabel: '結束',
  elapsed: ms => {
    const { h, m, s } = split(ms)

    return h > 0 ? `耗時 ${h}小時${m}分` : m > 0 ? `耗時 ${m}分${s}秒` : `耗時 ${s}秒`
  },
  chartDesktopOnly: '折線圖只在桌面應用程式裡顯示。',
  close: '關閉',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const en: Dict = {
  ctx: 'Context',
  five: '5-hour',
  week: 'Weekly',
  shortCtx: 'Context',
  shortFive: '5h',
  shortWeek: 'Week',
  fiveWindow: '5-hour limit',
  weekWindow: 'Weekly limit',
  warn: (name, percent) => `${name} at ${percent}%`,
  inDays: (d, h) => `in ${d}d ${h}h`,
  inHours: (h, m) => `in ${h}h ${m}m`,
  inMins: m => `in ${m}m`,
  resetSoon: 'resets soon',
  tomorrow: 'tomorrow',
  weekday: i => WEEKDAYS_EN[i] ?? '',
  date: (m, d) => `${MONTHS[m - 1] ?? ''} ${d}`,
  compacting: 'Compacting context… (can take a minute or two)',
  compacted: 'Context compacted',
  notCompacted: reason => `Not compacted: ${reason}`,
  tip: 'Click to compact context',
  tipCells: 26,
  statsTip: 'Show / hide token trend',
  statsTipCells: 26,
  statsTitle: 'Token breakdown (this session)',
  statsEmpty: 'Nothing recorded yet. Counting starts with the first reply after this mod loads.',
  statsTurns: n => `${n} turn${n === 1 ? '' : 's'}`,
  sIn: 'Fresh input',
  sOut: 'Output',
  sCreate: 'Cache write',
  sHit: 'Cache read',
  sRate: 'Cache hit rate',
  sub: 'sub-agent',
  statsAxis: n => `last ${n} turn${n === 1 ? '' : 's'}`,
  startLabel: 'Start',
  endLabel: 'End',
  elapsed: ms => {
    const { h, m, s } = split(ms)

    return h > 0 ? `took ${h}h ${m}m` : m > 0 ? `took ${m}m ${s}s` : `took ${s}s`
  },
  chartDesktopOnly: 'The chart is only drawn in the Desktop app.',
  close: 'Close',
}

const ja: Dict = {
  ctx: 'コンテキスト',
  five: '5時間',
  week: '週間',
  shortCtx: 'コンテキスト',
  shortFive: '5時間',
  shortWeek: '週',
  fiveWindow: '5時間枠',
  weekWindow: '週間枠',
  warn: (name, percent) => `${name}が${percent}%に達しました`,
  inDays: (d, h) => `${d}日${h}時間後`,
  inHours: (h, m) => `${h}時間${m}分後`,
  inMins: m => `${m}分後`,
  resetSoon: 'まもなくリセット',
  tomorrow: '明日',
  weekday: i => `${'日月火水木金土'[i]}曜`,
  date: (m, d) => `${m}月${d}日`,
  compacting: 'コンテキストを圧縮中…(長いと1〜2分かかります)',
  compacted: 'コンテキストを圧縮しました',
  notCompacted: reason => `圧縮しませんでした:${reason}`,
  tip: 'クリックでコンテキストを圧縮',
  tipCells: 28,
  statsTip: 'トークン推移を表示/非表示',
  statsTipCells: 28,
  statsTitle: 'トークン内訳(このセッション)',
  statsEmpty: 'まだ記録がありません。このModを読み込んだ後の最初の応答から集計します。',
  statsTurns: n => `${n} ターン`,
  sIn: '新規入力',
  sOut: '出力',
  sCreate: 'キャッシュ作成',
  sHit: 'キャッシュ読取',
  sRate: 'キャッシュヒット率',
  sub: 'サブエージェント',
  statsAxis: n => `直近 ${n} ターン`,
  startLabel: '開始',
  endLabel: '終了',
  elapsed: ms => {
    const { h, m, s } = split(ms)

    return h > 0 ? `所要 ${h}時間${m}分` : m > 0 ? `所要 ${m}分${s}秒` : `所要 ${s}秒`
  },
  chartDesktopOnly: 'グラフはデスクトップアプリでのみ表示されます。',
  close: '閉じる',
}

export const DICTS: Record<string, Dict> = { zh, 'zh-TW': zhTW, en, ja }

/** 取不到或写错了语言代码时,退回简体中文。 */
export const pickDict = (language: unknown): Dict => DICTS[String(language)] ?? zh
