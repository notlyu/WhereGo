import type { Place, Vote } from '@/types/models'

/**
 * В-1: очередь свайпов — места, по которым я ещё не голосовал.
 *
 * Идеи исключены: у них нет ни адреса, ни фото, свайпать нечего.
 * «Не зашло» тоже: место уже отсмотрено, спрашивать о нём снова незачем.
 */
export function selectSwipeQueue(places: Place[], votes: Vote[], meId: string | null): Place[] {
  if (!meId) return []

  const mine = new Set(votes.filter((vote) => vote.userId === meId).map((vote) => vote.placeId))

  return places.filter((place) => !place.isIdea && place.status !== 'rejected' && !mine.has(place.id))
}

/**
 * В-2: «оба хотим» — места, за которые проголосовали двое и оба сказали «да».
 *
 * Тот же смысл, что у представления `matches` в БД: `count(*) > 1 and
 * bool_and(wants)`. Считаем на клиенте, потому что голоса и так уже загружены
 * для очереди свайпов, а лишний запрос ради того же ответа не нужен.
 */
export function selectMatches(places: Place[], votes: Vote[]): Place[] {
  const byPlace = new Map<string, Vote[]>()
  for (const vote of votes) {
    const list = byPlace.get(vote.placeId)
    if (list) list.push(vote)
    else byPlace.set(vote.placeId, [vote])
  }

  const matched = new Set(
    [...byPlace.entries()]
      .filter(([, list]) => list.length > 1 && list.every((vote) => vote.wants))
      .map(([placeId]) => placeId),
  )

  return places.filter((place) => matched.has(place.id))
}

/** Сколько мест я уже отсмотрел из всех, что можно свайпать. */
export function swipeProgress(places: Place[], votes: Vote[], meId: string | null): { done: number; total: number } {
  const swipeable = places.filter((place) => !place.isIdea && place.status !== 'rejected')
  const mine = new Set(votes.filter((vote) => vote.userId === meId).map((vote) => vote.placeId))

  return {
    done: swipeable.filter((place) => mine.has(place.id)).length,
    total: swipeable.length,
  }
}

/**
 * В-5: «Выбери за нас» — случайное место из тех, что хочется обоим.
 * Если совпадений нет, берём из тех, что просто в планах на посещение.
 */
export function pickRandom(matches: Place[], fallback: Place[]): Place | null {
  const pool = matches.length > 0 ? matches : fallback.filter((place) => place.status === 'want')
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}
