import { describe, expect, it } from 'vitest'

import type { Filters } from '@/hooks/useFilters'
import type { Category, Place, PlaceStatus, PriceLevel } from '@/types/models'

import { groupByCategory, selectIdeas, selectPlaces } from './select-places'

const CAFE: Category = { id: 'c-cafe', name: 'Кафе', emoji: '☕', sortOrder: 10 }
const BAR: Category = { id: 'c-bar', name: 'Бар', emoji: '🍸', sortOrder: 30 }

const BASE_FILTERS: Filters = {
  q: '',
  category: 'all',
  status: 'all',
  price: 'all',
  want: 'all',
  sort: 'new',
  view: 'rails',
}

function place(patch: Partial<Place> & { id: string }): Place {
  return {
    title: 'Место',
    categoryId: CAFE.id,
    status: 'want' as PlaceStatus,
    isIdea: false,
    description: null,
    address: null,
    lat: null,
    lng: null,
    sourceUrl: null,
    sourceTitle: null,
    price: 'low' as PriceLevel,
    authorId: 'u-ly',
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    category: CAFE,
    author: { id: 'u-ly', displayName: 'Ly', avatarUrl: null },
    rating: null,
    coverUrl: null,
    ...patch,
  }
}

const FIXTURE: Place[] = [
  place({ id: '1', title: 'Больше кофе', description: 'фильтр на Рубинштейна', rating: null }),
  place({ id: '2', title: 'Город 812', categoryId: BAR.id, category: BAR, status: 'visited', price: 'medium', rating: 4.25 }),
  place({ id: '3', title: 'Панорама «Небо»', status: 'rejected', price: 'high', rating: 2.75, authorId: 'u-me' }),
  place({ id: '4', title: 'Сварить пасту дома', isIdea: true, categoryId: null, category: null }),
]

describe('selectPlaces', () => {
  it('прячет идеи — у них свой сегмент', () => {
    const result = selectPlaces(FIXTURE, BASE_FILTERS, 'u-ly')
    expect(result.map((p) => p.id)).toEqual(['1', '2', '3'])
  })

  it('ищет по названию, описанию и адресу', () => {
    const byTitle = selectPlaces(FIXTURE, { ...BASE_FILTERS, q: 'город' }, 'u-ly')
    expect(byTitle.map((p) => p.id)).toEqual(['2'])

    const byDescription = selectPlaces(FIXTURE, { ...BASE_FILTERS, q: 'Рубинштейна' }, 'u-ly')
    expect(byDescription.map((p) => p.id)).toEqual(['1'])
  })

  it('фильтрует по категории, статусу и бюджету', () => {
    expect(selectPlaces(FIXTURE, { ...BASE_FILTERS, category: BAR.id }, 'u-ly').map((p) => p.id)).toEqual(['2'])
    expect(selectPlaces(FIXTURE, { ...BASE_FILTERS, status: 'rejected' }, 'u-ly').map((p) => p.id)).toEqual(['3'])
    expect(selectPlaces(FIXTURE, { ...BASE_FILTERS, price: 'medium' }, 'u-ly').map((p) => p.id)).toEqual(['2'])
  })

  it('«кто хочет» берёт только места со статусом want нужного автора', () => {
    // У места 3 автор u-me, но статус rejected — в «хочет u-me» оно попасть не должно.
    expect(selectPlaces(FIXTURE, { ...BASE_FILTERS, want: 'u-me' }, 'u-ly')).toEqual([])
    expect(selectPlaces(FIXTURE, { ...BASE_FILTERS, want: 'u-ly' }, 'u-ly').map((p) => p.id)).toEqual(['1'])
  })

  it('сортирует по рейтингу, ставя места без отзывов в конец', () => {
    const result = selectPlaces(FIXTURE, { ...BASE_FILTERS, sort: 'rating' }, 'u-ly')
    expect(result.map((p) => p.id)).toEqual(['2', '3', '1'])
  })

  it('сортирует по цене от дешёвых к дорогим', () => {
    const result = selectPlaces(FIXTURE, { ...BASE_FILTERS, sort: 'cheap' }, 'u-ly')
    expect(result.map((p) => p.price)).toEqual(['low', 'medium', 'high'])
  })

  it('не трогает исходный массив', () => {
    const before = FIXTURE.map((p) => p.id)
    selectPlaces(FIXTURE, { ...BASE_FILTERS, sort: 'alpha' }, 'u-ly')
    expect(FIXTURE.map((p) => p.id)).toEqual(before)
  })
})

describe('groupByCategory', () => {
  it('складывает места в полки по категориям', () => {
    const sections = groupByCategory(selectPlaces(FIXTURE, BASE_FILTERS, 'u-ly'))
    expect(sections.map((s) => [s.label, s.places.length])).toEqual([
      ['Кафе', 2],
      ['Бар', 1],
    ])
  })
})

describe('selectIdeas', () => {
  it('отдаёт только идеи', () => {
    expect(selectIdeas(FIXTURE).map((p) => p.id)).toEqual(['4'])
  })
})
