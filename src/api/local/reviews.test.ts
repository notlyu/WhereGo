import { beforeEach, describe, expect, it } from 'vitest'

import { localBackend, resetLocalStore } from './index'
import { SEED_PROFILES } from './seed'

const SESSION_KEY = 'kuda-poyti/local-session/v1'
const [STAS, ALINA] = SEED_PROFILES

/**
 * Правила отзывов проверяются на локальном бэкенде: он реализует тот же
 * контракт, что и боевой, и в отличие от него запускается в тесте.
 *
 * В Supabase те же ограничения держит база — `unique (place_id, author_id)`
 * и RLS. Тест не подменяет их, а фиксирует поведение, которое видит интерфейс.
 */
describe('отзывы, локальный бэкенд', () => {
  beforeEach(() => {
    resetLocalStore()
    localStorage.setItem(SESSION_KEY, STAS.id)
  })

  it('О-1: повторное сохранение правит отзыв, а не заводит второй', async () => {
    await localBackend.reviews.save('p1', { rating: 5, text: 'Первый заход', visitedAt: '2026-07-01' })
    await localBackend.reviews.save('p1', { rating: 3, text: 'Передумал', visitedAt: '2026-07-02' })

    const reviews = await localBackend.reviews.listForPlace('p1')
    expect(reviews).toHaveLength(1)
    expect(reviews[0].rating).toBe(3)
    expect(reviews[0].text).toBe('Передумал')
  })

  it('О-3: отзывы обоих лежат рядом', async () => {
    await localBackend.reviews.save('p1', { rating: 4, text: 'От Стаса', visitedAt: null })

    localStorage.setItem(SESSION_KEY, ALINA.id)
    await localBackend.reviews.save('p1', { rating: 5, text: 'От Алины', visitedAt: null })

    const reviews = await localBackend.reviews.listForPlace('p1')
    expect(reviews).toHaveLength(2)
    expect(reviews.map((r) => r.author?.displayName).sort()).toEqual(['Алина', 'Стас'])
  })

  it('О-4: чужой отзыв удалить нельзя', async () => {
    await localBackend.reviews.save('p1', { rating: 4, text: 'От Стаса', visitedAt: null })
    const [mine] = await localBackend.reviews.listForPlace('p1')

    localStorage.setItem(SESSION_KEY, ALINA.id)
    await expect(localBackend.reviews.remove(mine.id)).rejects.toThrow(/только свой/)

    expect(await localBackend.reviews.listForPlace('p1')).toHaveLength(1)
  })

  it('О-5: средняя оценка считается по отзывам, а не хранится', async () => {
    await localBackend.reviews.save('p1', { rating: 2, text: null, visitedAt: null })
    localStorage.setItem(SESSION_KEY, ALINA.id)
    await localBackend.reviews.save('p1', { rating: 5, text: null, visitedAt: null })

    const place = await localBackend.places.get('p1')
    expect(place?.rating).toBe(3.5)
  })

  it('место без отзывов имеет rating null — «ещё не были», а не ноль', async () => {
    const place = await localBackend.places.get('p4')
    expect(place?.rating).toBeNull()
  })

  it('удаление отзыва возвращает место к состоянию без оценки', async () => {
    await localBackend.reviews.save('p1', { rating: 4, text: null, visitedAt: null })
    const [mine] = await localBackend.reviews.listForPlace('p1')

    await localBackend.reviews.remove(mine.id)

    expect(await localBackend.reviews.listForPlace('p1')).toHaveLength(0)
    expect((await localBackend.places.get('p1'))?.rating).toBeNull()
  })
})
