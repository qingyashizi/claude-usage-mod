export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Usage = { context?: number; tokens?: number; window?: number; limits: Limit[] }

/** 一轮回复的用量:四项 token 是 API 报的数,ms 是这一轮花的时间。 */
export type TurnRecord = {
  at: number
  model: string
  input: number
  output: number
  cacheRead: number
  cacheCreate: number
  ms: number
  isSub: boolean
}
export type Totals = { turns: number; input: number; output: number; cacheRead: number; cacheCreate: number }
export type Stats = { total: Totals; recent: TurnRecord[] }

declare module 'claude-code' {
  interface PluginState {
    'usage-mod': { usage: Usage; now: number; stats: Stats; hidden: string[]; open: boolean }
  }
}
