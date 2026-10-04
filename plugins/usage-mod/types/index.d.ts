export type Limit = { kind: string; percentUsed: number; resetsAt?: string }
export type Usage = { context?: number; tokens?: number; window?: number; limits: Limit[] }

declare module 'claude-code' {
  interface PluginState {
    'usage-mod': { usage: Usage; now: number }
  }
}
