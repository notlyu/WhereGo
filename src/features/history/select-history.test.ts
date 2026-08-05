import { describe, expect, it } from 'vitest'

import type { Category, Place, PlaceStatus, Review } from '@/types/models'

import { selectVisits, selectYear, yearsWithVisits } from './select-history'

const БАР: Category = { id: 'c-bar', name: 'Бар', emoji: null, sortOrder: 30 }
const КАФЕ: Category = { id: 'c-cafe', name: 'Кафе', emoji: null, sortOrder: 10 }

function place(id: string, patch: Partial<Place> = {}): Place {
  return {
    id,
    title: 'Место ' + id,
    categoryId: БАР.id,
    status: 'visited' as PlaceStatus,
    isIdea: false,
    description: null,
    address: null,
    lat: null,
    lng: null,
    sourceUrl: null,
    sourceTitle: null,
    price: null,
    authorId: 'u-stas',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-15T00:00:00Z',
    category: БАР,
    author: null,
    rating: null,
    coverUrl: null,
    tags: [],
    openingHours: null,
    ...patch,
  }
}

const review = (id: string, placeId: string, rating: number, visitedAt: string | null): Review => ({
  id,
  placeId,
  authorId: 'u-stas',
  rating,
  text: null,
  visitedAt,
  createdAt: '2026-01-01T00:00:00Z',
  author: null,
})

describe('selectVisits', () => {
  it('берёт только посещённые места', () => {
    const places = [place('a'), place('b', { status: 'want' }), place('c', { status: 'rejected' })]
    expect(selectVisits(places, []).map((v) => v.place.id)).toEqual(['a'])
  })

  it('идеи в историю не попадают', () => {
    expect(selectVisits([place('a', { isIdea: true })], [])).toEqual([])
  })

  it('дату берёт из отзыва, а не из даты правки', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 5, '2026-03-08')])
    expect(visits[0].date).toBe('2026-03-08')
  })

  it('без отзыва падает на дату правки — поход был, впечатления не записали', () => {
    const visits = selectVisits([place('a', { updatedAt: '2026-06-15T10:00:00Z' })], [])
    expect(visits[0].date).toBe('2026-06-15')
    expect(visits[0].rating).toBeNull()
  })

  it('ходили дважды — показываем последний раз', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 4, '2026-01-10'), review('r2', 'a', 5, '2026-05-20')])
    expect(visits[0].date).toBe('2026-05-20')
  })

  it('средняя оценка — по отзывам обоих', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 4, '2026-03-08'), review('r2', 'a', 5, '2026-03-08')])
    expect(visits[0].rating).toBe(4.5)
  })

  it('сортирует от новых к старым', () => {
    const visits = selectVisits(
      [place('a'), place('b')],
      [review('r1', 'a', 5, '2026-01-10'), review('r2', 'b', 5, '2026-07-01')],
    )
    expect(visits.map((v) => v.place.id)).toEqual(['b', 'a'])
  })
})

describe('selectYear', () => {
  const visits = selectVisits(
    [place('a'), place('b'), place('c', { categoryId: КАФЕ.id, category: КАФЕ }), place('d')],
    [
      review('r1', 'a', 5, '2026-02-01'),
      review('r2', 'b', 3, '2026-03-01'),
      review('r3', 'c', 4, '2026-04-01'),
      review('r4', 'd', 5, '2025-12-01'),
    ],
  )

  it('считает только выбранный год', () => {
    expect(selectYear(visits, 2026).visits).toBe(3)
    expect(selectYear(visits, 2025).visits).toBe(1)
  })

  it('полосы по категориям — от частых к редким', () => {
    const stats = selectYear(visits, 2026)
    expect(stats.byCategory.map((bar) => [bar.label, bar.count])).toEqual([
      ['Бар', 2],
      ['Кафе', 1],
    ])
    expect(stats.byCategory[0].share).toBe(1)
    expect(stats.byCategory[1].share).toBe(0.5)
  })

  it('любимая категория — первая из полос', () => {
    expect(selectYear(visits, 2026).topCategory).toEqual({ label: 'Бар', count: 2 })
  })

  it('лучшая оценка — место с наибольшей средней', () => {
    expect(selectYear(visits, 2026).bestRated?.place.id).toBe('a')
  })

  it('пустой год не ломается и не делит на ноль', () => {
    const stats = selectYear(visits, 2020)
    expect(stats.visits).toBe(0)
    expect(stats.byCategory).toEqual([])
    expect(stats.topCategory).toBeNull()
    expect(stats.bestRated).toBeNull()
    expect(stats.priciest).toBeNull()
    expect(stats.topAuthor).toBeNull()
  })
})

describe('selectYear · самый дорогой', () => {
  it('берёт место с самой высокой меткой цены', () => {
    const visits = selectVisits(
      [place('a', { price: 'low' }), place('b', { price: 'high' }), place('c', { price: 'medium' })],
      [review('r1', 'a', 5, '2026-01-01'), review('r2', 'b', 4, '2026-01-02'), review('r3', 'c', 4, '2026-01-03')],
    )
    expect(selectYear(visits, 2026).priciest?.place.id).toBe('b')
  })

  it('места без цены не мешают — «бесплатно» тоже цена', () => {
    const visits = selectVisits(
      [place('a', { price: null }), place('b', { price: 'free' })],
      [review('r1', 'a', 5, '2026-01-01'), review('r2', 'b', 5, '2026-01-02')],
    )
    expect(selectYear(visits, 2026).priciest?.place.id).toBe('b')
  })

  it('цен нет вовсе — прочерк, а не выдуманное место', () => {
    const visits = selectVisits([place('a', { price: null })], [review('r1', 'a', 5, '2026-01-01')])
    expect(selectYear(visits, 2026).priciest).toBeNull()
  })
})

describe('selectYear · единогласие', () => {
  it('пять и четыре с половиной — не спор', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 5, '2026-01-01'), review('r2', 'a', 4.5, '2026-01-01')])
    const best = selectYear(visits, 2026).bestRated
    expect(best?.ratings).toEqual([5, 4.5])
    expect(best?.unanimous).toBe(true)
  })

  it('пять против трёх — разошлись', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 5, '2026-01-01'), review('r2', 'a', 3, '2026-01-01')])
    expect(selectYear(visits, 2026).bestRated?.unanimous).toBe(false)
  })

  it('один отзыв единогласием не считается', () => {
    const visits = selectVisits([place('a')], [review('r1', 'a', 5, '2026-01-01')])
    expect(selectYear(visits, 2026).bestRated?.unanimous).toBe(false)
  })
})

describe('selectYear · добавляет чаще', () => {
  const АЛИНА = { id: 'u-alina', displayName: 'Алина', avatarUrl: null }
  const СТАС = { id: 'u-stas', displayName: 'Стас', avatarUrl: null }

  const added = [
    place('a', { authorId: СТАС.id, author: СТАС, createdAt: '2026-01-01T00:00:00Z' }),
    place('b', { authorId: СТАС.id, author: СТАС, createdAt: '2026-02-01T00:00:00Z' }),
    place('c', { authorId: АЛИНА.id, author: АЛИНА, createdAt: '2026-03-01T00:00:00Z' }),
    place('d', { authorId: АЛИНА.id, author: АЛИНА, createdAt: '2025-03-01T00:00:00Z' }),
  ]

  it('считает по году заведения, а не по году похода', () => {
    expect(selectYear([], 2026, added).topAuthor).toEqual({ name: 'Стас', count: 2, rivalCount: 1 })
  })

  it('идеи в счёт не идут', () => {
    const withIdeas = [...added, place('e', { authorId: АЛИНА.id, author: АЛИНА, isIdea: true, createdAt: '2026-04-01T00:00:00Z' })]
    expect(selectYear([], 2026, withIdeas).topAuthor?.name).toBe('Стас')
  })

  it('за год никто ничего не добавил — прочерк', () => {
    expect(selectYear([], 2024, added).topAuthor).toBeNull()
  })
})

describe('yearsWithVisits', () => {
  it('годы без повторов, от новых к старым', () => {
    const visits = selectVisits(
      [place('a'), place('b'), place('c')],
      [review('r1', 'a', 5, '2026-02-01'), review('r2', 'b', 5, '2025-05-01'), review('r3', 'c', 5, '2026-09-01')],
    )
    expect(yearsWithVisits(visits)).toEqual([2026, 2025])
  })
})
