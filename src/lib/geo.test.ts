import { describe, expect, it } from 'vitest'

import { formatDistance } from './format'
import { haversine, SPB_CENTER, yandexMapsUrl } from './geo'

describe('haversine', () => {
  it('до самой себя — ноль', () => {
    expect(haversine(59.9386, 30.3141, 59.9386, 30.3141)).toBe(0)
  })

  it('центр Петербурга — Кронштадт, около 30 км', () => {
    const metres = haversine(SPB_CENTER.lat, SPB_CENTER.lng, 59.9967, 29.7681)
    expect(metres).toBeGreaterThan(28_000)
    expect(metres).toBeLessThan(33_000)
  })

  it('симметрична', () => {
    const there = haversine(59.9386, 30.3141, 60.1533, 30.5147)
    const back = haversine(60.1533, 30.5147, 59.9386, 30.3141)
    expect(there).toBeCloseTo(back, 6)
  })

  it('градус широты — примерно 111 км', () => {
    const metres = haversine(59, 30, 60, 30)
    expect(metres).toBeGreaterThan(110_000)
    expect(metres).toBeLessThan(112_000)
  })
})

describe('yandexMapsUrl', () => {
  it('ставит долготу перед широтой — Яндекс ждёт именно так', () => {
    const url = new URL(yandexMapsUrl(SPB_CENTER.lat, SPB_CENTER.lng))
    expect(url.searchParams.get('ll')).toBe('30.314100,59.938600')
    expect(url.searchParams.get('whatshere[point]')).toBe('30.314100,59.938600')
  })

  it('перепутанный порядок увёл бы из Петербурга — проверяем на глаз', () => {
    // 59.94 долготы и 30.31 широты — это Каспий, а не Невский проспект.
    expect(yandexMapsUrl(59.9386, 30.3141)).not.toContain('59.938600%2C30.314100')
  })

  it('открывает карточку точки, а не просто метку — с неё строят маршрут', () => {
    const url = new URL(yandexMapsUrl(SPB_CENTER.lat, SPB_CENTER.lng))
    expect(url.pathname).toBe('/maps/')
    expect(url.searchParams.get('z')).toBe('17')
  })

  it('не скатывается в экспоненциальную запись у нулевых координат', () => {
    expect(new URL(yandexMapsUrl(0.0000001, 0)).searchParams.get('ll')).toBe('0.000000,0.000000')
  })

  it('отрицательные координаты остаются целыми', () => {
    expect(new URL(yandexMapsUrl(-33.8688, 151.2093)).searchParams.get('ll')).toBe('151.209300,-33.868800')
  })
})

describe('formatDistance', () => {
  it('до километра — в метрах, без дробей', () => {
    expect(formatDistance(840)).toBe('840 м')
    expect(formatDistance(999)).toBe('999 м')
  })

  it('от километра — с десятыми и запятой', () => {
    expect(formatDistance(2400)).toBe('2,4 км')
    expect(formatDistance(48_000)).toBe('48,0 км')
  })

  it('ровно километр уже не в метрах', () => {
    expect(formatDistance(1000)).toBe('1,0 км')
  })
})
