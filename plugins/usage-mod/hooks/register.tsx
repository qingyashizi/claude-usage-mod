import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit, Stats, TurnRecord, Usage } from '../types'
import { pickDict } from './i18n'
import type { Dict } from './i18n'

const usage = atom({ plugin: 'usage-mod', key: 'usage' } as const, { limits: [] } as Usage)
const now = atom({ plugin: 'usage-mod', key: 'now' } as const, 0)
// 本会话每轮回复的 token 用量:合计一直累加,明细只留最近 MAX_TURNS 轮。
const stats = atom({ plugin: 'usage-mod', key: 'stats' } as const, {
  total: { turns: 0, input: 0, output: 0, cacheRead: 0, cacheCreate: 0 },
  recent: [],
} as Stats)

// 折线图里被用户点掉的曲线,以及折线图当前是不是展开着。
const hiddenSeries = atom({ plugin: 'usage-mod', key: 'hidden' } as const, [] as string[])
const statsOpen = atom({ plugin: 'usage-mod', key: 'open' } as const, false)

const MAX_TURNS = 50

// 5 小时/每周窗口的用量是账号级的,存到 mod 自己文件夹下的文件里,同一份安装的所有会话共用。
const cachePath = ($: EngineInterface) => `${$.plugin.root}/cache/limits.json`

const WARN = 90
const warned = new Set<string>()

const ORANGE = '#D77757'
const WARM = '#3f3f46'
const DARK = '#161616'
const LIGHT = '#ececec'

// 压缩按钮:点一下直接压缩。明细按钮:点一下在横条上方展开 / 收起 token 折线图。
const ICON = '🗜'
const STATS_ICON = '📊'
const BUTTON_CELLS = 3

const pad = (n: number) => String(n).padStart(2, '0')

/** token 数的短写法:834、35.5k、1.2M;和上下文那块用的 tokensText 不同,小数字不取整到 k。 */
const countText = (n: number) => {
  if (n >= 1000000) return `${Number((n / 1000000).toFixed(1))}M`
  if (n >= 1000) return `${Number((n / 1000).toFixed(1))}k`

  return String(n)
}

/** 缓存命中率:命中的输入占全部输入(新增、缓存创建、缓存命中三项之和)的比例。 */
const hitRate = (input: number, cacheRead: number, cacheCreate: number) => {
  const all = input + cacheRead + cacheCreate

  return all === 0 ? '—' : `${((cacheRead / all) * 100).toFixed(1)}%`
}

const modelName = (model: string) => model.replace(/^claude-/, '').replace(/-\d{8}$/, '')

/** 折线图的四条曲线,颜色和 CC Switch 一致:缓存命中紫、缓存创建橙、新增输入蓝、输出绿。 */
type SeriesKey = 'input' | 'output' | 'cacheCreate' | 'cacheRead'
/** 折线图画成自带底色的深色卡片:应用把 SVG 当不透明图片画,不画底就是一块白纸。底色取应用窗口的背景色 rgb(33,33,33),网格线和文字也用不偏色的中性灰,不然会偏蓝。 */
const CARD = '#212121'
const GRID = '#3a3a3a'
const MUTED = '#a3a3a3'

/**
 * 折线图的画布宽度和最大高度(CSS 像素)。Svg 元素要显式给宽高,不然应用自己挑,会缩得很小。
 * 宽度跟着横条的格数走(Svg 只收像素,量不了横条的实际像素宽):一格按 7.6 像素算。设得比横条实际能放的宽,应用会把整张图等比缩小,
 * 图就比框矮一截,上下露出白底(实测一格按 8.4 时就出现了),反推实际约 7.9,所以取 7.6 留余量;最外层的底色也铺成深色,万一缩了露出来的也不是白的;
 * 高度按横条能给的行数再往下缩。
 */
const CHART_PX_PER_CELL = 7.6
/** 第一行放五项合计时,窗口窄于这个格数就把标题去掉,不然挤不下。 */
const TITLE_MIN_COLUMNS = 112
const CHART_MIN_W = 480
const CHART_MAX_W = 1400
const CHART_MAX_H = 260

const SERIES: Array<{ key: SeriesKey; color: string }> = [
  { key: 'cacheRead', color: '#a855f7' },
  { key: 'cacheCreate', color: '#f97316' },
  { key: 'input', color: '#3b82f6' },
  { key: 'output', color: '#22c55e' },
]

const seriesLabel = (L: Dict, key: SeriesKey) => ({ input: L.sIn, output: L.sOut, cacheCreate: L.sCreate, cacheRead: L.sHit })[key]

const clockText = (at: number) => `${pad(new Date(at).getHours())}:${pad(new Date(at).getMinutes())}`

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** 纵轴上限取 1、2、5、10 乘以 10 的幂,刻度才好读。 */
const niceMax = (value: number) => {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  const m = value / power

  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * power
}

/** 悬停明细卡片的底色和边线:底色比图的底色更深,但画成半透明,下面的曲线还隐约看得见。 */
const TIP_BG = '#0f0f0f'
const TIP_LINE = '#525252'
const TIP_TEXT = '#ececec'

/** 图里画曲线的区域离画布左、右边的像素数。 */
const PLOT_LEFT = 58
const PLOT_RIGHT = 14

/** 一段文字在图里占多宽(像素,12 号字):中日文约 12,其余约 6.7,多留一点余量。SVG 量不了字宽,只能估。 */
const textPx = (text: string) => [...text].reduce((sum, ch) => sum + ((ch.codePointAt(0) ?? 0) > 0x2e7f ? 12 : 6.7), 0) + 2

/**
 * 选中那一轮的明细卡片的前两行:开始、结束、用时和模型。
 * 结束时刻是 Mod 收到"这一轮结束"那一刻的时间,开始时刻是它减去引擎报的这一轮总耗时。
 * 总耗时是墙上时间,你让它停着等的时间也算在里面。
 */
const tipHead = (L: Dict, r: TurnRecord): [string, string] => [
  `${L.startLabel} ${stampText(r.at - r.ms)}  →  ${L.endLabel} ${stampText(r.at)}`,
  `${L.elapsed(r.ms)}  ·  ${modelName(r.model)}${r.isSub ? ` (${L.sub})` : ''}`,
]

/**
 * 折线图,画成一段 SVG。横轴是最近几轮回复,纵轴是 token 数。
 * 每一轮一个悬停组(class="c"):鼠标移到这一列上,列高亮、出竖线和放大的点,并弹出明细卡片。
 * 沙盒里不能跑脚本,全靠 CSS :hover;卡片放在这一列的右边,右边放不下就放左边,底色半透明,不挡住被指的这一列。
 * 这样的 SVG 要放进沙盒小窗口(isInteractive)画,横条每次重画窗口都会重建,所以会偶尔闪一下。
 */
const chartSvg = (L: Dict, turns: TurnRecord[], hidden: string[], width: number, height: number) => {
  const W = width
  const H = height
  const left = PLOT_LEFT
  const right = PLOT_RIGHT
  const top = 12
  const bottom = 26
  const pw = W - left - right
  const ph = H - top - bottom
  const shown = SERIES.filter(one => !hidden.includes(one.key))
  const max = niceMax(Math.max(0, ...shown.flatMap(one => turns.map(r => r[one.key]))))
  const n = turns.length
  const step = n === 1 ? pw : pw / (n - 1)
  const x = (i: number) => (n === 1 ? left + pw / 2 : left + step * i)
  const y = (v: number) => top + ph * (1 - v / max)
  const f = (v: number) => v.toFixed(1)

  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:${CARD}" font-family="sans-serif" font-size="12">`,
    '<style>.c .h,.c .t{display:none}.c:hover .h,.c:hover .t{display:inline}.c:hover .band{fill-opacity:.08}</style>',
    `<rect width="${W}" height="${H}" fill="${CARD}"/>`,
  ]
  for (let i = 0; i <= 4; i += 1) {
    const v = (max * i) / 4
    out.push(
      `<line x1="${left}" x2="${W - right}" y1="${f(y(v))}" y2="${f(y(v))}" stroke="${GRID}"/>`,
      `<text x="${left - 6}" y="${f(y(v) + 4)}" text-anchor="end" fill="${MUTED}">${countText(v)}</text>`,
    )
  }
  for (const one of shown) {
    const points = turns.map((r, i) => `${f(x(i))},${f(y(r[one.key]))}`)
    out.push(`<polyline points="${points.join(' ')}" fill="none" stroke="${one.color}" stroke-width="2" stroke-linejoin="round"/>`)
    for (const point of points) {
      const [px, py] = point.split(',')
      out.push(`<circle cx="${px}" cy="${py}" r="2.5" fill="${one.color}"/>`)
    }
  }
  out.push(
    `<text x="${left}" y="${H - 6}" fill="${MUTED}">${clockText(turns[0]!.at)}</text>`,
    `<text x="${left + pw / 2}" y="${H - 6}" text-anchor="middle" fill="${MUTED}">${esc(L.statsAxis(n))}</text>`,
    `<text x="${W - right}" y="${H - 6}" text-anchor="end" fill="${MUTED}">${clockText(turns[n - 1]!.at)}</text>`,
  )

  // 悬停组放在最后,卡片才画在曲线和文字上面。
  const rowH = 18
  const inset = 10
  turns.forEach((r, i) => {
    const cx = x(i)
    const bandX = n === 1 ? left : i === 0 ? left : cx - step / 2
    const bandW = n === 1 ? pw : i === 0 || i === n - 1 ? step / 2 : step
    const head = tipHead(L, r)
    const cells = SERIES.map(one => `${seriesLabel(L, one.key)} ${countText(r[one.key])}`)
    const col1 = Math.max(textPx(cells[0]!), textPx(cells[2]!)) + 14
    const col2 = Math.max(textPx(cells[1]!), textPx(cells[3]!)) + 14
    const cardW = Math.round(Math.max(...head.map(textPx), col1 + 16 + col2) + inset * 2)
    const cardH = inset * 2 + rowH * 4
    const gap = 14
    const cardX = Math.round(cx + gap + cardW <= W - 4 ? cx + gap : Math.max(4, cx - gap - cardW))
    const cardY = Math.round(Math.min(H - 4 - cardH, top + 4))

    out.push(
      '<g class="c">',
      `<rect class="band" x="${f(bandX)}" y="${top}" width="${f(bandW)}" height="${f(ph)}" fill="#ffffff" fill-opacity="0" pointer-events="all"/>`,
      '<g class="h">',
      `<line x1="${f(cx)}" x2="${f(cx)}" y1="${top}" y2="${f(top + ph)}" stroke="#ffffff" stroke-opacity=".35" stroke-dasharray="3 3"/>`,
      ...shown.map(one => `<circle cx="${f(cx)}" cy="${f(y(r[one.key]))}" r="4.5" fill="${one.color}" stroke="${CARD}" stroke-width="1.5"/>`),
      '</g>',
      '<g class="t">',
      `<rect x="${cardX}" y="${cardY}" width="${cardW}" height="${cardH}" rx="6" fill="${TIP_BG}" fill-opacity=".82" stroke="${TIP_LINE}"/>`,
      `<text x="${cardX + inset}" y="${cardY + inset + 12}" fill="${TIP_TEXT}">${esc(head[0])}</text>`,
      `<text x="${cardX + inset}" y="${cardY + inset + 12 + rowH}" fill="${MUTED}">${esc(head[1])}</text>`,
      ...SERIES.flatMap((one, k) => {
        const tx = cardX + inset + (k % 2 === 0 ? 0 : col1 + 16)
        const ty = cardY + inset + 12 + rowH * (2 + Math.floor(k / 2))

        return [`<circle cx="${tx + 4}" cy="${ty - 4}" r="4" fill="${one.color}"/>`, `<text x="${tx + 14}" y="${ty}" fill="${TIP_TEXT}">${esc(cells[k]!)}</text>`]
      }),
      '</g>',
      '</g>',
    )
  })
  out.push('</svg>')

  return out.join('')
}

/** 精确到秒的时刻;不是今天的前面带上月/日。 */
const stampText = (at: number) => {
  const d = new Date(at)
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

  return startOfDay(d) === startOfDay(new Date()) ? time : `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${time}`
}


const remaining = (L: Dict, resetsAt: string | undefined, at: number) => {
  if (resetsAt === undefined) return ''
  const ms = Date.parse(resetsAt) - at
  if (Number.isNaN(ms)) return ''
  if (ms <= 0) return L.resetSoon
  const minutes = Math.ceil(ms / 60000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return L.inDays(days, hours)
  if (hours > 0) return L.inHours(hours, mins)

  return L.inMins(mins)
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

const clock = (L: Dict, resetsAt: string | undefined, at: number) => {
  if (resetsAt === undefined) return ''
  const target = new Date(resetsAt)
  if (Number.isNaN(target.getTime())) return ''
  const days = Math.round((startOfDay(target) - startOfDay(new Date(at))) / 86400000)
  const time = `${pad(target.getHours())}:${pad(target.getMinutes())}`
  if (days === 0) return time
  if (days === 1) return `${L.tomorrow} ${time}`
  if (days > 1 && days < 7) return `${L.weekday(target.getDay())} ${time}`

  return `${L.date(target.getMonth() + 1, target.getDate())} ${time}`
}

const tokensText = (n: number | undefined) => {
  if (n === undefined) return '—'
  if (n >= 1000000) return `${Number((n / 1000000).toFixed(1))}M`

  return `${Math.round(n / 1000)}k`
}

const find = (limits: Limit[], kind: string) => limits.find(one => one.kind === kind)

/** 窗口还没到重置时间,存下来的数据才还算数。 */
const isLive = (one: Limit, at: number) => one.resetsAt === undefined || Date.parse(one.resetsAt) > at

const loadCache = async ($: EngineInterface, at: number): Promise<Limit[]> => {
  try {
    const saved: unknown = JSON.parse(String(await $.fs.read(cachePath($))))

    return Array.isArray(saved) ? (saved as Limit[]).filter(one => isLive(one, at)) : []
  } catch {
    return []
  }
}

const saveCache = async ($: EngineInterface, limits: Limit[]) => {
  try {
    await $.fs.write(cachePath($), JSON.stringify(limits))
  } catch {
    // 写不进去就算了,只是下个会话启动时没有上次的数据可用。
  }
}

/** 读一次引擎当前的用量,有变化才更新,避免白白重画。 */
const refresh = async ($: EngineInterface) => {
  const t = await $.clock.now()
  const current = await $.session.usage()
  const old = await read($, usage)
  let limits = old.limits.filter(one => isLive(one, t))
  if (current.rateLimits.length > 0) {
    limits = current.rateLimits
    if (JSON.stringify(limits) !== JSON.stringify(old.limits)) await saveCache($, limits)
  } else if (limits.length === 0) {
    // 这个会话还没收到过回复:先用文件里别的会话存下的。
    limits = await loadCache($, t)
  }
  const fresh: Usage = {
    context: current.context.percent,
    tokens: current.context.tokens,
    window: current.context.window,
    limits,
  }
  if (JSON.stringify(fresh) !== JSON.stringify(old)) await update($, usage, () => fresh)
  // 重置倒计时精确到分钟,每过一分钟更新一次时间。
  if (Math.floor(t / 60000) !== Math.floor((await read($, now)) / 60000)) await update($, now, () => t)
}

export const register: Register = (on, options) => {
  const L = pickDict((options as Record<string, unknown>).language)

  on('session.start', async ($, e, next) => {
    await refresh($)
    // 不只在每轮回复结束时更新:每 5 秒主动读一次,回复进行中、刚切到这个会话时数字也是新的。
    $.clock.every(5000, () => refresh($))

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await refresh($)

    const checks: Array<[string, string, number | undefined]> = [
      ['ctx', L.ctx, e.context.percent],
      ['five', L.fiveWindow, find(e.rateLimits, 'five_hour')?.percentUsed],
      ['week', L.weekWindow, find(e.rateLimits, 'seven_day')?.percentUsed],
    ]
    for (const [key, name, percent] of checks) {
      if (percent === undefined) continue
      if (percent >= WARN && !warned.has(key)) {
        warned.add(key)
        $.ui.toast(L.warn(name, Math.round(percent)))
      } else if (percent < WARN - 5) {
        warned.delete(key)
      }
    }

    return next(e)
  })

  // 只观察:先让这一轮正常收尾,再记下它的用量。记不进去也不影响回复。
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = e.usage
    if (u === undefined) return result
    try {
      const record: TurnRecord = {
        at: await $.clock.now(),
        model: u.model,
        input: u.input_tokens,
        output: u.output_tokens,
        cacheRead: u.cache_read_input_tokens,
        cacheCreate: u.cache_creation_input_tokens,
        ms: e.durationMs,
        isSub: e.agentId !== undefined,
      }
      await update($, stats, old => ({
        total: {
          turns: old.total.turns + 1,
          input: old.total.input + record.input,
          output: old.total.output + record.output,
          cacheRead: old.total.cacheRead + record.cacheRead,
          cacheCreate: old.total.cacheCreate + record.cacheCreate,
        },
        recent: [...old.recent, record].slice(-MAX_TURNS),
      }))
    } catch {
      // 少记一轮而已。
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const data = await read($, usage)
    const at = await read($, now)
    const isOpen = await read($, statsOpen)
    const { total, recent } = await read($, stats)
    const hidden = await read($, hiddenSeries)

    const five = find(data.limits, 'five_hour')
    const week = find(data.limits, 'seven_day')
    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    // 折线图是 SVG,只有桌面端等远程界面有这个元素。
    const Svg = 'Svg' in elements ? elements.Svg : undefined
    const isTerminal = e.surface === 'terminal'

    if (e.props.bodyColumns < 78) {
      const short = [
        data.context === undefined ? `${L.shortCtx} —` : `${L.shortCtx} ${Math.round(data.context)}%`,
        five === undefined ? `${L.shortFive} —` : `${L.shortFive} ${Math.round(five.percentUsed)}%`,
        week === undefined ? `${L.shortWeek} —` : `${L.shortWeek} ${Math.round(week.percentUsed)}%`,
      ].join(' · ')

      return (
        <Box width="100%" justifyContent="center">
          <Text>{short}</Text>
        </Box>
      )
    }

    // 三块等宽,块之间各留一格;减去的是两个按钮和四处间隙占的格数,不再额外留边距。
    const cells = Math.max(20, Math.floor((e.props.bodyColumns - 4 - 2 * BUTTON_CELLS) / 3))

    // 几何全部交给 Box:底色块铺满整块,橙色填充按百分比取宽度。
    // 文字画两层、各裁一半:填充内是深色字,填充外是浅色字,在填充边界处切开。
    // 不用空格撑宽度,因为桌面端字体不是等宽的,空格撑出来的宽度和 Box 的宽度对不上。
    const block = (key: string, label: string, percent: number | undefined, detail: string) => {
      const text = percent === undefined ? `${label} —` : `${label} ${Math.round(percent)}%${detail === '' ? '' : ` · ${detail}`}`
      const filled = percent === undefined ? 0 : percent <= 0 ? 0 : Math.min(cells, Math.max(1, Math.round((percent / 100) * cells)))
      const layer = (color: string, shift: number) => (
        <Box position="absolute" top={0} left={shift} width={cells} height={1} justifyContent="center">
          <Text color={color} wrap="truncate-end">
            {text}
          </Text>
        </Box>
      )

      return (
        <Box key={key} width={cells} height={1} backgroundColor={WARM}>
          {filled > 0 && (
            <Box position="absolute" top={0} left={0} width={filled} height={1} backgroundColor={ORANGE} overflow="hidden">
              {layer(DARK, 0)}
            </Box>
          )}
          {filled < cells && (
            <Box position="absolute" top={0} left={filled} width={cells - filled} height={1} overflow="hidden">
              {layer(LIGHT, -filled)}
            </Box>
          )}
        </Box>
      )
    }

    const ctxDetail = data.tokens === undefined ? '' : `${tokensText(data.tokens)} / ${tokensText(data.window)}`
    const fiveDetail = five === undefined ? '' : `${remaining(L, five.resetsAt, at)} · ${clock(L, five.resetsAt, at)}`
    const weekDetail = week === undefined ? '' : `${remaining(L, week.resetsAt, at)} · ${clock(L, week.resetsAt, at)}`

    const compact = async () => {
      $.ui.toast(L.compacting)
      try {
        // 不用 $.session.compact():桌面应用的会话是 SDK 无头会话,引擎不让插件直接调它。
        // 改成像用户输入 /compact 那样运行这条命令;引擎文档说回复进行中会排队到这一轮结束。
        await $.command.run({ command: 'compact' })
        $.ui.toast(L.compacted)
      } catch (err) {
        $.ui.toast(L.notCompacted(err instanceof Error ? err.message : String(err)))
      }
    }

    const toggleStats = () => void update($, statsOpen, open => !open)
    const toggleSeries = (key: SeriesKey) =>
      void update($, hiddenSeries, old => (old.includes(key) ? old.filter(one => one !== key) : [...old, key]))

    // 展开的明细:顶上是合计,中间是折线图,下面是曲线开关。画在横条里、用量条的上方,位置固定。
    const stat = (key: string, label: string, value: string) => (
      <Box key={key} gap={1}>
        <Text dimColor>{label}</Text>
        <Text bold>{value}</Text>
      </Box>
    )

    // 盖在折线图上的一排透明感应区,每轮一个,宽度按比例(flexGrow)和图里的点对齐(图是固定像素宽,Box 的宽度是格数;
    // 百分比宽度只收整数,量不准,所以按像素数当比例分)。鼠标移到某一轮上,同组(scope)的东西一起亮:这一列变成淡淡的高亮,图下面固定一行里显示那一轮的明细。
    // 悬停是应用自己处理的,没有任何东西回到插件,所以不会触发横条重画,图也就不会闪。
    // 横条的高度是应用定的(最多窗口的一半,放不下就滚动),所以图的高度跟着可用行数走,版面压紧:
    // 标题、曲线开关、关闭按钮一行,合计一行,其余都给图。一行大约按 20 像素算。
    const chartW = Math.round(Math.min(CHART_MAX_W, Math.max(CHART_MIN_W, e.props.bodyColumns * CHART_PX_PER_CELL)))
    const chartH = Math.max(140, Math.min(CHART_MAX_H, (e.props.maxRows - 5) * 20))

    const panel = (
      <Box key="stats-panel" flexDirection="column" width="100%" alignItems="center">
        {/* 第一行:五项合计放最前,标题放不下时(窗口窄)先让位;第二行:共几轮和四条曲线的开关。 */}
        <Box width="100%" justifyContent="space-between" gap={2}>
          {(total.turns === 0 || e.props.bodyColumns >= TITLE_MIN_COLUMNS) && <Text bold>{L.statsTitle}</Text>}
          {total.turns > 0 && (
            <Box gap={3}>
              {stat('in', L.sIn, countText(total.input))}
              {stat('out', L.sOut, countText(total.output))}
              {stat('create', L.sCreate, countText(total.cacheCreate))}
              {stat('hit', L.sHit, countText(total.cacheRead))}
              {stat('rate', L.sRate, hitRate(total.input, total.cacheRead, total.cacheCreate))}
            </Box>
          )}
          <Button key="stats-close" role="dismiss" label={L.close} onPress={toggleStats} />
        </Box>
        {total.turns === 0 ? (
          <Text dimColor>{L.statsEmpty}</Text>
        ) : (
          <Box flexDirection="column" width="100%" alignItems="center">
            {/* 图例在整行里居中;"共几轮"不占位置,贴在最左边。 */}
            <Box width="100%" justifyContent="center">
              <Box position="absolute" top={0} left={0}>
                <Text dimColor>{L.statsTurns(total.turns)}</Text>
              </Box>
              {Svg !== undefined && (
                <Box gap={2}>
                  {SERIES.map(one => (
                    <Box key={one.key} gap={1}>
                      <Text color={one.color} dimColor={hidden.includes(one.key)}>
                        ●
                      </Text>
                      <Button key={`toggle-${one.key}`} label={seriesLabel(L, one.key)} plain dimColor={hidden.includes(one.key)} onPress={() => toggleSeries(one.key)} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {Svg === undefined ? (
              <Text dimColor>{L.chartDesktopOnly}</Text>
            ) : (
              <Box flexDirection="column" width="100%" alignItems="center">
                <Svg key="chart" source={chartSvg(L, recent, hidden, chartW, chartH)} alt={`${L.statsTitle} · ${L.statsAxis(recent.length)}`} width={chartW} height={chartH} isInteractive />
              </Box>
            )}
          </Box>
        )}
      </Box>
    )

    // 悬停提示:平时不显示,鼠标移到图标上时才出现。桌面端应用自己把它画成深色卡片,用浅色字;终端里是橙底深字。
    const iconButton = (key: string, icon: string, tip: string, tipCells: number, onPress: () => void) => (
      <Box key={`${key}-wrap`} width={BUTTON_CELLS} justifyContent="center">
        <Button key={key} label={icon} plain onPress={onPress} />
        <Box
          position="absolute"
          top={0}
          left={BUTTON_CELLS}
          width={tipCells}
          height={1}
          justifyContent="center"
          backgroundColor={isTerminal ? ORANGE : undefined}
          display="none"
          hover={{ display: 'flex' }}
        >
          <Text color={isTerminal ? DARK : LIGHT}>{tip}</Text>
        </Box>
      </Box>
    )

    return (
      <Box width="100%" flexDirection="column" gap={1}>
        {isOpen && panel}
        <Box width="100%" justifyContent="center" gap={1}>
          {iconButton('compact', ICON, L.tip, L.tipCells, compact)}
          {iconButton('stats', STATS_ICON, L.statsTip, L.statsTipCells, toggleStats)}
          {block('ctx', L.ctx, data.context, ctxDetail)}
          {block('five', L.five, five?.percentUsed, fiveDetail)}
          {block('week', L.week, week?.percentUsed, weekDetail)}
        </Box>
      </Box>
    )
  })
}
