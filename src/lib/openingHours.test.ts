import { describe, expect, it } from 'vitest'

import { formatDay, isOpenNow, parseHours, todayLabel } from './openingHours'

/** Понедельник, 1 июня 2026. Дальше сдвигаем часами. */
const monday = (hh: number, mm = 0) => new Date(2026, 5, 1, hh, mm)
const tuesday = (hh: number, mm = 0) => new Date(2026, 5, 2, hh, mm)

describe('parseHours', () => {
  it('разбирает обычные часы', () => {
    expect(parseHours({ mon: [['10:00', '22:00']] })).toEqual({ mon: [['10:00', '22:00']] })
  })

  it('мусор считаем отсутствием часов, а не падаем', () => {
    expect(parseHours(null)).toBeNull()
    expect(parseHours('10-22')).toBeNull()
    expect(parseHours([])).toBeNull()
    expect(parseHours({ mon: 'весь день' })).toBeNull()
    expect(parseHours({ mon: [['10', '22']] })).toBeNull()
  })

  it('пустой день выкидывает — это выходной', () => {
    expect(parseHours({ mon: [], tue: [['09:00', '18:00']] })).toEqual({ tue: [['09:00', '18:00']] })
  })
})

describe('isOpenNow', () => {
  const hours = parseHours({ mon: [['10:00', '22:00']], tue: [['22:00', '02:00']] })

  it('внутри интервала — открыто', () => {
    expect(isOpenNow(hours, monday(15))).toBe(true)
  })

  it('до открытия и после закрытия — нет', () => {
    expect(isOpenNow(hours, monday(9, 59))).toBe(false)
    expect(isOpenNow(hours, monday(22, 0))).toBe(false)
  })

  it('смена через полночь: в час ночи среды работает вторничная', () => {
    expect(isOpenNow(hours, new Date(2026, 5, 3, 1, 0))).toBe(true)
    expect(isOpenNow(hours, new Date(2026, 5, 3, 3, 0))).toBe(false)
  })

  it('день без часов — закрыто', () => {
    expect(isOpenNow(hours, new Date(2026, 5, 4, 15, 0))).toBe(false)
  })

  it('без часов вообще ничего не утверждаем', () => {
    expect(isOpenNow(null, monday(15))).toBe(false)
  })

  it('перерыв на обед', () => {
    const lunch = parseHours({ mon: [['09:00', '13:00'], ['14:00', '18:00']] })
    expect(isOpenNow(lunch, monday(12))).toBe(true)
    expect(isOpenNow(lunch, monday(13, 30))).toBe(false)
    expect(isOpenNow(lunch, monday(15))).toBe(true)
  })
})

describe('formatDay', () => {
  it('один интервал', () => {
    expect(formatDay([['10:00', '22:00']])).toBe('10:00–22:00')
  })

  it('с перерывом', () => {
    expect(formatDay([['09:00', '13:00'], ['14:00', '18:00']])).toBe('09:00–13:00, 14:00–18:00')
  })

  it('выходной', () => {
    expect(formatDay(undefined)).toBe('закрыто')
    expect(formatDay([])).toBe('закрыто')
  })
})

describe('todayLabel', () => {
  it('берёт нужный день недели', () => {
    const hours = parseHours({ mon: [['10:00', '22:00']], tue: [['12:00', '20:00']] })
    expect(todayLabel(hours, monday(15))).toBe('сегодня 10:00–22:00')
    expect(todayLabel(hours, tuesday(15))).toBe('сегодня 12:00–20:00')
  })
})
