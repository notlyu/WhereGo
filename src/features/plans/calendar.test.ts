import { describe, expect, it } from 'vitest'

import type { Plan } from '@/types/models'

import { buildMonth, dateKey, monthTitle, nextPlan, plansForDay } from './calendar'

const plan = (id: string, date: string, time: string | null = null): Plan => ({
  id,
  placeId: 'p1',
  plannedDate: date,
  plannedTime: time,
  note: null,
  createdBy: 'u-stas',
  place: null,
})

describe('dateKey', () => {
  it('берёт локальную дату, а не UTC', () => {
    // 1 января 03:00 по Москве — это ещё 31 декабря по UTC.
    // toISOString() дал бы «2026-12-31» и сдвинул бы весь календарь.
    const date = new Date(2026, 0, 1, 3, 0, 0)
    expect(dateKey(date)).toBe('2026-01-01')
  })

  it('дополняет нулями', () => {
    expect(dateKey(new Date(2026, 8, 5))).toBe('2026-09-05')
  })
})

describe('buildMonth', () => {
  it('всегда 42 клетки — календарь не прыгает по высоте', () => {
    expect(buildMonth(new Date(2026, 1, 1), [])).toHaveLength(42)
    expect(buildMonth(new Date(2026, 7, 1), [])).toHaveLength(42)
  })

  it('неделя начинается с понедельника', () => {
    // 1 августа 2026 — суббота, значит перед ней пять дней июля.
    const days = buildMonth(new Date(2026, 7, 1), [])
    expect(days[0].outside).toBe(true)
    const firstOfMonth = days.findIndex((day) => !day.outside)
    expect(days[firstOfMonth].n).toBe(1)
    expect(firstOfMonth).toBe(5)
  })

  it('дни соседних месяцев помечены', () => {
    const days = buildMonth(new Date(2026, 7, 1), [])
    const inside = days.filter((day) => !day.outside)
    expect(inside).toHaveLength(31)
    expect(inside.map((day) => day.n)).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it('считает планы по дням', () => {
    const days = buildMonth(new Date(2026, 7, 1), [
      plan('a', '2026-08-08'),
      plan('b', '2026-08-08'),
      plan('c', '2026-08-22'),
    ])
    expect(days.find((day) => day.date === '2026-08-08')?.plans).toBe(2)
    expect(days.find((day) => day.date === '2026-08-22')?.plans).toBe(1)
    expect(days.find((day) => day.date === '2026-08-09')?.plans).toBe(0)
  })

  it('февраль високосного года — 29 дней', () => {
    const inside = buildMonth(new Date(2028, 1, 1), []).filter((day) => !day.outside)
    expect(inside).toHaveLength(29)
  })
})

describe('plansForDay', () => {
  it('отбирает планы выбранного дня', () => {
    const plans = [plan('a', '2026-08-08'), plan('b', '2026-08-09')]
    expect(plansForDay(plans, '2026-08-08').map((p) => p.id)).toEqual(['a'])
  })
})

describe('nextPlan', () => {
  it('берёт ближайший, прошедшие пропускает', () => {
    const today = dateKey(new Date())
    const future = dateKey(new Date(Date.now() + 5 * 86_400_000))
    const past = dateKey(new Date(Date.now() - 5 * 86_400_000))

    expect(nextPlan([plan('a', past), plan('b', future), plan('c', today)])?.id).toBe('c')
  })

  it('когда впереди ничего нет — null', () => {
    const past = dateKey(new Date(Date.now() - 86_400_000))
    expect(nextPlan([plan('a', past)])).toBeNull()
  })
})

describe('monthTitle', () => {
  it('месяц по-русски со строчной буквы', () => {
    expect(monthTitle(new Date(2026, 7, 1))).toBe('август 2026')
  })
})
