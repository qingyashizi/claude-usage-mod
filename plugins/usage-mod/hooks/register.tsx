import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit, Usage } from '../types'
import { pickDict } from './i18n'
import type { Dict } from './i18n'

const usage = atom({ plugin: 'usage-mod', key: 'usage' } as const, { limits: [] } as Usage)
const now = atom({ plugin: 'usage-mod', key: 'now' } as const, 0)

// 5 小时/每周窗口的用量是账号级的,存到 mod 自己文件夹下的文件里,同一份安装的所有会话共用。
const cachePath = ($: EngineInterface) => `${$.plugin.root}/cache/limits.json`

const WARN = 90
const warned = new Set<string>()

const ORANGE = '#D77757'
const WARM = '#3f3f46'
const DARK = '#161616'
const LIGHT = '#ececec'

// 压缩按钮:点一下直接压缩。
const ICON = '🗜'
const BUTTON_CELLS = 3

const pad = (n: number) => String(n).padStart(2, '0')

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

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const data = await read($, usage)
    const at = await read($, now)

    const five = find(data.limits, 'five_hour')
    const week = find(data.limits, 'seven_day')
    const { Box, Button, Text } = $.ui.resolve(e)
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

    // 三块等宽,块之间各留一格;减去的是按钮和三处间隙占的格数,不再额外留边距。
    const cells = Math.max(20, Math.floor((e.props.bodyColumns - 3 - BUTTON_CELLS) / 3))

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

    return (
      <Box width="100%" justifyContent="center" gap={1}>
        <Box key="compact-wrap" width={BUTTON_CELLS} justifyContent="center">
          <Button key="compact" label={ICON} plain onPress={compact} />
          {/* 悬停提示:平时不显示,鼠标移到图标上时才出现。桌面端应用自己把它画成深色卡片,用浅色字;终端里是橙底深字。 */}
          <Box
            position="absolute"
            top={0}
            left={BUTTON_CELLS}
            width={L.tipCells}
            height={1}
            justifyContent="center"
            backgroundColor={isTerminal ? ORANGE : undefined}
            display="none"
            hover={{ display: 'flex' }}
          >
            <Text color={isTerminal ? DARK : LIGHT}>{L.tip}</Text>
          </Box>
        </Box>
        {block('ctx', L.ctx, data.context, ctxDetail)}
        {block('five', L.five, five?.percentUsed, fiveDetail)}
        {block('week', L.week, week?.percentUsed, weekDetail)}
      </Box>
    )
  })
}
