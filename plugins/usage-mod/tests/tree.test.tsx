import { expect, test } from 'claude-code/testing'

// 折线图本身是 SVG,测试环境里没有 Svg 元素,画不出来;但盖在图上的悬停感应区和明细行用的都是普通 Box,
// 这里把它们用到的写法原样用引擎的规则验一遍。引擎只要发现树里有一处不合法就整棵丢掉,横条就一点都不显示。
// 踩过的坑:Box 的 width 只收整数格数或整数百分比,"8.06%" 这样带小数的会被拒绝。
const PANE = { title: 't', isFocused: false, bodyColumns: 100, placement: 'inline', scroll: { offset: 0, bodyRows: 10 }, view: {} }

const GOOD: Record<string, (Box: any, Text: any) => unknown> = {
  '用 flexGrow 按比例分宽度的感应区,带悬停分组和悬停高亮': Box => (
    <Box position="relative">
      <Box position="absolute" top={0} left={0} width="100%" height="100%">
        <Box width={0} flexGrow={58} height="100%" />
        <Box width={0} minWidth={0} flexGrow={6.612} height="100%" backgroundColor="#ffffff01" hover={{ scope: 'usage-turn-0', backgroundColor: '#ffffff1a' }} />
        <Box width={0} flexGrow={14} height="100%" />
      </Box>
    </Box>
  ),
  '感应区里的悬停明细卡片(左半边向右展开、右半边向左展开)': (Box, Text) => (
    <Box position="relative">
      <Box position="absolute" top={0} left={0} width="100%" height="100%">
        <Box key="usage-turn-0" width={0} minWidth={0} flexGrow={6} height="100%" backgroundColor="#ffffff01" hover={{ scope: 'usage-turn-0', backgroundColor: '#ffffff1a' }}>
          <Box key="tip-0" position="absolute" top={1} left={0} width={34} paddingX={1} flexDirection="column" backgroundColor="#0f0f0e" display="none" hover={{ scope: 'usage-turn-0', display: 'flex' }}>
            <Text color="#ececec">明细</Text>
            <Box gap={2}>
              <Box gap={1}>
                <Text color="#a855f7">●</Text>
                <Text color="#ececec">缓存命中 12.9M</Text>
              </Box>
            </Box>
          </Box>
        </Box>
        <Box key="usage-turn-1" width={0} minWidth={0} flexGrow={6} height="100%" backgroundColor="#ffffff01" hover={{ scope: 'usage-turn-1', backgroundColor: '#ffffff1a' }}>
          <Box key="tip-1" position="absolute" top={1} right={0} width={34} paddingX={1} display="none" hover={{ scope: 'usage-turn-1', display: 'flex' }}>
            <Text>明细</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  ),
  '固定一行里叠着、悬停才显示的明细': (Box, Text) => (
    <Box height={1} width="100%" justifyContent="center">
      <Box position="absolute" top={0} left={0} width="100%" justifyContent="center" display="none" hover={{ scope: 'usage-turn-0', display: 'flex' }}>
        <Text>明细</Text>
      </Box>
    </Box>
  ),
}

const props = PANE as never

for (const [name, tree] of Object.entries(GOOD)) {
  test(name, async ($, on) => {
    on('ui.render', { component: 'Pane' } as never, (($$: any, e: any) => {
      const { Box, Text } = $$.ui.resolve(e)
      return tree(Box, Text)
    }) as never)
    const ui = await $.ui.mount({ plugin: 'usage-mod', surface: 'desktop', component: 'Pane', requestId: 'tree', viewport: { columns: 100, rows: 30 }, props } as never)
    expect(ui).toBeDefined()
    await (ui as { unmount: () => Promise<void> }).unmount()
  })
}

test('带小数的百分比宽度会被引擎拒绝(别再用)', async ($, on) => {
  on('ui.render', { component: 'Pane' } as never, (($$: any, e: any) => {
    const { Box } = $$.ui.resolve(e)
    return <Box width="8.06%" />
  }) as never)
  await expect(
    $.ui.mount({ plugin: 'usage-mod', surface: 'desktop', component: 'Pane', requestId: 'bad', viewport: { columns: 100, rows: 30 }, props } as never),
  ).rejects.toThrow()
})
