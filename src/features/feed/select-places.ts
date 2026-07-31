import type { Filters } from '@/hooks/useFilters'
import type { Place } from '@/types/models'

const PRICE_ORDER = { free: 0, low: 1, medium: 2, high: 3 } as const

function matchesQuery(place: Place, query: string): boolean {
  if (!query) return true
  const needle = query.trim().toLowerCase()
  // Л-3: поиск по названию и описанию. Адрес добавлен — искать «Рубинштейна»
  // естественнее, чем вспоминать, как называется кофейня.
  return [place.title, place.description, place.address].some((field) => field?.toLowerCase().includes(needle))
}

/**
 * Л-3, Л-4, Л-7: отбор и сортировка ленты.
 *
 * Отдельная чистая функция, а не тело компонента: её видно целиком, она
 * покрывается тестом без рендера и переиспользуется картой (К-6, Этап 3).
 */
export function selectPlaces(places: Place[], filters: Filters, meId: string | null): Place[] {
  const result = places.filter((place) => {
    if (place.isIdea) return false
    if (!matchesQuery(place, filters.q)) return false
    if (filters.category !== 'all' && place.categoryId !== filters.category) return false
    if (filters.status !== 'all' && place.status !== filters.status) return false
    if (filters.price !== 'all' && place.price !== filters.price) return false

    if (filters.want !== 'all') {
      // До Этапа 4 голосов нет: «кто хочет» = автор места со статусом want.
      if (place.status !== 'want') return false
      if (filters.want === 'both') return false
      if (filters.want === 'me') return place.authorId === meId
      return place.authorId === filters.want
    }

    return true
  })

  const sorters: Record<Filters['sort'], ((a: Place, b: Place) => number) | null> = {
    new: null, // список уже приходит от новых к старым
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
    alpha: (a, b) => a.title.localeCompare(b.title, 'ru'),
    cheap: (a, b) => (a.price ? PRICE_ORDER[a.price] : 9) - (b.price ? PRICE_ORDER[b.price] : 9),
    pricey: (a, b) => (b.price ? PRICE_ORDER[b.price] : -1) - (a.price ? PRICE_ORDER[a.price] : -1),
  }

  const sorter = sorters[filters.sort]
  return sorter ? result.slice().sort(sorter) : result
}

export interface Section {
  categoryId: string
  label: string
  places: Place[]
}

/** Л-10: полки по категориям — вид по умолчанию, как в прототипе. */
export function groupByCategory(places: Place[]): Section[] {
  const sections = new Map<string, Section>()

  for (const place of places) {
    const categoryId = place.categoryId ?? 'none'
    let section = sections.get(categoryId)
    if (!section) {
      section = { categoryId, label: place.category?.name ?? 'Без категории', places: [] }
      sections.set(categoryId, section)
    }
    section.places.push(place)
  }

  return [...sections.values()]
}

export function selectIdeas(places: Place[]): Place[] {
  return places.filter((place) => place.isIdea)
}
