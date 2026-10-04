import { expect, test } from 'claude-code/testing'

// 用引擎自己的规则把横条画一遍:显示树里有它不接受的元素或属性,mount 会直接拒绝并说明原因。
// 这是 `claude plugin validate` 查不出来的,它只看清单和模块的源码,不画树。
// 测试环境里没有 Svg 元素,折线图本身画不出来(那一段在 tree.test.tsx 里单独验),所以这里只确认展开后的面板在。
const BAND = {
  plugin: 'usage-mod',
  component: 'AbovePrompt' as const,
  viewport: { columns: 150, rows: 40 },
  props: { hasSurvey: false, isWorking: false, maxRows: 14, bodyColumns: 150, scroll: { offset: 0, bodyRows: 13 }, view: {} },
}

// 让插件真的收到"一轮回复结束"的事件,它自己把用量记下来。
const finishTurns = async ($: { turn: { complete: (input: never) => Promise<unknown> } }, count: number) => {
  for (let i = 0; i < count; i += 1) {
    await $.turn.complete({
      answer: '',
      durationMs: 15_000 + i * 1000,
      isAborted: false,
      turnId: `t${i}`,
      reason: 'answer',
      usage: {
        model: 'claude-sonnet-5-5',
        input_tokens: 10 + i,
        output_tokens: 1000 + i * 100,
        cache_read_input_tokens: 100_000 * (i + 1),
        cache_creation_input_tokens: 2000,
      },
    } as never)
  }
}

test('收起时横条能被桌面端接受', async $ => {
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ key: 'stats' })).toBeDefined()
  await ui.unmount()
})

test('展开折线图时整棵树能被桌面端接受', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  await finishTurns($, 6)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'stats' })
  expect(await ui.find({ key: 'stats-panel' })).toBeDefined()
  await ui.unmount()
})

test('只有一轮、五十轮的时候也能画', async ($, on) => {
  on('turn.complete', () => ({ text: '' }))
  for (const count of [1, 50]) {
    await finishTurns($, count)
    const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
    // 展开状态在同一个测试里会保留,只在还没展开时才按。
    if ((await ui.find({ key: 'stats-panel' })) === undefined) await ui.press({ key: 'stats' })
    expect(await ui.find({ key: 'stats-panel' })).toBeDefined()
    await ui.unmount()
  }
})
