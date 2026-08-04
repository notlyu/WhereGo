import type { Place, Review } from '@/types/models'

export interface Visit {
  place: Place
  /** Дата посещения: из отзыва, иначе — когда место перевели в «были». */
  date: string
  /** Средняя оценка обоих; null — сходили, а записать не успели. */
  rating: number | null
  /** Отзывы этого места — из них берётся дата и оценка. */
  reviews: Review[]
}

/**
 * И-1: хронология походов.
 *
 * Дату берём из отзыва — человек указывает её сам и помнит лучше, чем
 * `updated_at`. Если отзыва нет, а место уже «были», остаётся дата правки:
 * поход был, просто впечатления не записали.
 */
export function selectVisits(places: Place[], reviews: Review[]): Visit[] {
  const byPlace = new Map<string, Review[]>()
  for (const review of reviews) {
    const list = byPlace.get(review.placeId)
    if (list) list.push(review)
    else byPlace.set(review.placeId, [review])
  }

  return places
    .filter((place) => place.status === 'visited' && !place.isIdea)
    .map((place) => {
      const own = byPlace.get(place.id) ?? []
      const dates = own.map((review) => review.visitedAt).filter((date): date is string => Boolean(date))

      return {
        place,
        // Ходили несколько раз — в хронологии показываем последний.
        date: dates.sort().at(-1) ?? place.updatedAt.slice(0, 10),
        rating: own.length ? own.reduce((sum, review) => sum + review.rating, 0) / own.length : null,
        reviews: own,
      }
    })
    .sort((a, b) => b.date.localeCompare(a.date))
}

export interface YearStats {
  year: number
  visits: number
  /** Сколько разных мест, а не походов: в одно можно вернуться. */
  places: number
  reviews: number
  /** Средняя оценка за год; null — оценок не было. */
  averageRating: number | null
  /** И-2: полосы по категориям, от частых к редким. */
  byCategory: { label: string; count: number; share: number }[]
  /** Место с самой высокой оценкой за год. */
  best: Place | null
}

/** И-2: итоги за год. Год по умолчанию — текущий. */
export function selectYear(visits: Visit[], year = new Date().getFullYear()): YearStats {
  const ofYear = visits.filter((visit) => visit.date.startsWith(String(year)))

  const counts = new Map<string, number>()
  for (const visit of ofYear) {
    const label = visit.place.category?.name ?? 'Без категории'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const top = Math.max(1, ...counts.values())

  const rated = ofYear.filter((visit) => visit.rating !== null)

  return {
    year,
    visits: ofYear.length,
    places: new Set(ofYear.map((visit) => visit.place.id)).size,
    reviews: ofYear.reduce((sum, visit) => sum + visit.reviews.length, 0),
    averageRating: rated.length ? rated.reduce((sum, visit) => sum + (visit.rating ?? 0), 0) / rated.length : null,
    byCategory: [...counts.entries()]
      .map(([label, count]) => ({ label, count, share: count / top }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru')),
    best: rated.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]?.place ?? null,
  }
}

/** Годы, за которые есть что показать, — от новых к старым. */
export function yearsWithVisits(visits: Visit[]): number[] {
  return [...new Set(visits.map((visit) => Number(visit.date.slice(0, 4))))].sort((a, b) => b - a)
}
