import { describe, expect, it } from 'vitest'

import { planChunkRecovery } from './lazyImport'

function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

describe('planChunkRecovery', () => {
  it('первый сбой — перезагружаемся: скорее всего вышла новая версия', () => {
    expect(planChunkRecovery(fakeStorage())).toBe('reload')
  })

  it('второй сбой подряд — сдаёмся, иначе получим бесконечную перезагрузку', () => {
    const storage = fakeStorage()
    expect(planChunkRecovery(storage)).toBe('reload')
    expect(planChunkRecovery(storage)).toBe('give-up')
    expect(planChunkRecovery(storage)).toBe('give-up')
  })
})
