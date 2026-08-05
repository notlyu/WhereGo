import type { Place, PriceLevel, Review } from '@/types/models'

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
  /** И-2: полосы по категориям, от частых к редким. */
  byCategory: { label: string; count: number; share: number }[]
  /** «Любимая категория» — первая из полос, вынесена отдельно для читаемости. */
  topCategory: { label: string; count: number } | null
  /** «Самый дорогой» поход года. Метка цены, а не сумма, — см. комментарий ниже. */
  priciest: { place: Place; price: PriceLevel } | null
  /** «Лучшая оценка»: место и то, как его оценил каждый. */
  bestRated: { place: Place; ratings: number[]; unanimous: boolean } | null
  /** «Добавляет чаще»: кто завёл больше мест за год и с каким отрывом. */
  topAuthor: { name: string; count: number; rivalCount: number } | null
}

/** Порядок дороговизны. В модели цена — метка, а не сумма (М-3). */
const PRICE_ORDER: PriceLevel[] = ['free', 'low', 'medium', 'high']

/**
 * И-2: итоги за год. Год по умолчанию — текущий.
 *
 * `places` нужен только для «добавляет чаще»: там считаются все заведённые
 * места, а не только те, куда успели сходить.
 */
export function selectYear(visits: Visit[], year = new Date().getFullYear(), places: Place[] = []): YearStats {
  const ofYear = visits.filter((visit) => visit.date.startsWith(String(year)))

  const counts = new Map<string, number>()
  for (const visit of ofYear) {
    const label = visit.place.category?.name ?? 'Без категории'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const top = Math.max(1, ...counts.values())

  const byCategory = [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: count / top }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'ru'))

  return {
    year,
    visits: ofYear.length,
    byCategory,
    topCategory: byCategory[0] ? { label: byCategory[0].label, count: byCategory[0].count } : null,
    priciest: priciestOf(ofYear),
    bestRated: bestRatedOf(ofYear),
    topAuthor: topAuthorOf(places, year),
  }
}

/**
 * Самый дорогой поход года.
 *
 * Показываем метку цены, а не сумму: в форме места спрашивается «₽/₽₽/₽₽₽»,
 * рублей мы нигде не собираем. Придумать сумму из метки нельзя, а показать
 * выдуманную — хуже, чем показать честную метку.
 */
function priciestOf(visits: Visit[]): { place: Place; price: PriceLevel } | null {
  let best: { place: Place; price: PriceLevel } | null = null

  for (const visit of visits) {
    const price = visit.place.price
    if (!price) continue
    if (!best || PRICE_ORDER.indexOf(price) > PRICE_ORDER.indexOf(best.price)) {
      best = { place: visit.place, price }
    }
  }

  return best
}

/** Место с самой высокой средней оценкой и то, как его оценил каждый. */
function bestRatedOf(visits: Visit[]): { place: Place; ratings: number[]; unanimous: boolean } | null {
  const rated = visits.filter((visit) => visit.rating !== null)
  if (rated.length === 0) return null

  const winner = [...rated].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))[0]
  const ratings = winner.reviews.map((review) => review.rating).sort((a, b) => b - a)

  return {
    place: winner.place,
    ratings,
    // Полбалла — не спор. Разошлись — это когда одному понравилось,
    // а другому нет, а не когда «пять» против «четыре с половиной».
    unanimous: ratings.length > 1 && ratings[0] - ratings[ratings.length - 1] <= 0.5,
  }
}

/**
 * Кто за год завёл больше мест.
 *
 * Считаются места, а не идеи: идея — это строчка «сходить в баню когда-нибудь»,
 * и мерить ими вклад нечестно.
 */
function topAuthorOf(places: Place[], year: number): { name: string; count: number; rivalCount: number } | null {
  const counts = new Map<string, number>()

  for (const place of places) {
    if (place.isIdea || !place.createdAt.startsWith(String(year))) continue
    const name = place.author?.displayName
    if (!name) continue
    counts.set(name, (counts.get(name) ?? 0) + 1)
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ru'))
  if (ranked.length === 0) return null

  return { name: ranked[0][0], count: ranked[0][1], rivalCount: ranked[1]?.[1] ?? 0 }
}

/** Годы, за которые есть что показать, — от новых к старым. */
export function yearsWithVisits(visits: Visit[]): number[] {
  return [...new Set(visits.map((visit) => Number(visit.date.slice(0, 4))))].sort((a, b) => b - a)
}
