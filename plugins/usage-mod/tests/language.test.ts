import { expect, test } from 'claude-code/testing'
import { DICTS, languageOf, pickDict } from '../hooks/i18n'

test('按电脑的语言挑:简体、繁体、日语,其余英文', () => {
  expect(languageOf('zh-CN')).toBe('zh')
  expect(languageOf('zh-Hans-CN')).toBe('zh')
  expect(languageOf('zh-SG')).toBe('zh')
  expect(languageOf('zh')).toBe('zh')
  expect(languageOf('zh-TW')).toBe('zh-TW')
  expect(languageOf('zh-HK')).toBe('zh-TW')
  expect(languageOf('zh-MO')).toBe('zh-TW')
  expect(languageOf('zh-Hant')).toBe('zh-TW')
  expect(languageOf('zh_TW')).toBe('zh-TW')
  expect(languageOf('ja-JP')).toBe('ja')
  expect(languageOf('en-US')).toBe('en')
  expect(languageOf('fr-FR')).toBe('en')
  expect(languageOf('')).toBe('en')
})

test('设置里选了具体语言就用它,选自动或写错了才看电脑', () => {
  expect(pickDict('ja')).toBe(DICTS.ja)
  expect(pickDict('zh-TW')).toBe(DICTS['zh-TW'])
  expect(pickDict('en')).toBe(DICTS.en)
  expect(Object.values(DICTS)).toContain(pickDict('auto'))
  expect(Object.values(DICTS)).toContain(pickDict(undefined))
  expect(Object.values(DICTS)).toContain(pickDict('klingon'))
})
