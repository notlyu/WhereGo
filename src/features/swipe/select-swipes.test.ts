import { describe, expect, it } from 'vitest'

import type { Place, PlaceStatus, Vote } from '@/types/models'

import { pickRandom, selectMatches, selectSwipeQueue, swipeProgress } from './select-swipes'

const STAS = 'u-stas'
const ALINA = 'u-alina'

function place(id: string, patch: Partial<Place> = {}): Place {
  return {
    id,
    title: 'Место ' + id,
    categoryId: null,
    status: 'want' as PlaceStatus,
    isIdea: false,
    description: null,
    address: null,
    lat: null,
    lng: null,
    sourceUrl: null,
    sourceTitle: null,
    price: null,
    authorId: STAS,
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    category: null,
    author: null,
    rating: null,
    coverUrl: null,
    tags: [],
    openingHours: null,
    ...patch,
  }
}

const vote = (placeId: string, userId: string, wants: boolean): Vote => ({ placeId, userId, wants })

describe('selectSwipeQueue', () => {
  const places = [place('a'), place('b'), place('c', { isIdea: true }), place('d', { status: 'rejected' })]

  it('показывает только то, по чему я ещё не голосовал', () => {
    const queue = selectSwipeQueue(places, [vote('a', STAS, true)], STAS)
    expect(queue.map((p) => p.id)).toEqual(['b'])
  })

  it('чужой голос очередь не сокращает — голос индивидуальный', () => {
    const queue = selectSwipeQueue(places, [vote('a', ALINA, true)], STAS)
    expect(queue.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('идеи и «не зашло» не свайпаются', () => {
    const queue = selectSwipeQueue(places, [], STAS)
    expect(queue.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('без пользователя очередь пуста', () => {
    expect(selectSwipeQueue(places, [], null)).toEqual([])
  })
})

describe('selectMatches', () => {
  const places = [place('a'), place('b'), place('c')]

  it('совпадение — когда оба сказали «хочу»', () => {
    const matches = selectMatches(places, [vote('a', STAS, true), vote('a', ALINA, true)])
    expect(matches.map((p) => p.id)).toEqual(['a'])
  })

  it('один «за», другой «против» — не совпадение', () => {
    expect(selectMatches(places, [vote('a', STAS, true), vote('a', ALINA, false)])).toEqual([])
  })

  it('голос одного человека — ещё не совпадение', () => {
    expect(selectMatches(places, [vote('a', STAS, true)])).toEqual([])
  })

  it('оба «против» — не совпадение', () => {
    expect(selectMatches(places, [vote('a', STAS, false), vote('a', ALINA, false)])).toEqual([])
  })

  it('разбирает несколько мест сразу', () => {
    const matches = selectMatches(places, [
      vote('a', STAS, true),
      vote('a', ALINA, true),
      vote('b', STAS, true),
      vote('b', ALINA, false),
      vote('c', STAS, true),
      vote('c', ALINA, true),
    ])
    expect(matches.map((p) => p.id)).toEqual(['a', 'c'])
  })
})

describe('swipeProgress', () => {
  it('считает отсмотренное от того, что вообще свайпается', () => {
    const places = [place('a'), place('b'), place('c', { isIdea: true })]
    expect(swipeProgress(places, [vote('a', STAS, true)], STAS)).toEqual({ done: 1, total: 2 })
  })
})

describe('pickRandom', () => {
  it('берёт из совпадений, когда они есть', () => {
    const matches = [place('a')]
    expect(pickRandom(matches, [place('b'), place('c')])?.id).toBe('a')
  })

  it('без совпадений берёт из тех, куда хочется', () => {
    const chosen = pickRandom([], [place('b'), place('c', { status: 'visited' })])
    expect(chosen?.id).toBe('b')
  })

  it('когда выбирать не из чего — null', () => {
    expect(pickRandom([], [place('c', { status: 'visited' })])).toBeNull()
  })
})
