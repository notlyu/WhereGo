import { useMemo } from 'react'

import { useAuth } from '@/hooks/auth-context'
import { useCategories, usePlaces } from '@/hooks/queries'
import { useFilters } from '@/hooks/useFilters'
import { useGeolocation, type Coords } from '@/hooks/useGeolocation'
import type { Category, Place, Profile } from '@/types/models'

import { collectTags, groupByCategory, selectIdeas, selectPlaces, type Section } from './select-places'

export interface FeedData {
  meId: string | null
  me: Profile | null
  /** М-13: последняя известная геопозиция, если её разрешали. */
  here: Coords | null
  /** Все места, прошедшие фильтры (идеи исключены). */
  list: Place[]
  /** М-11: метки, которые встречаются в местах, — для шторки фильтров. */
  tagNames: string[]
  /** Полки по категориям — вид по умолчанию на телефоне. */
  sections: Section[]
  ideas: Place[]
  /** Сколько мест всего, без учёта фильтров: «12 из 19 мест». */
  totalCount: number
  categories: Category[]
  people: Profile[]
  filters: ReturnType<typeof useFilters>['filters']
  setFilter: ReturnType<typeof useFilters>['setFilter']
  reset: ReturnType<typeof useFilters>['reset']
  activeCount: number
  isPending: boolean
  isError: boolean
  error: unknown
}

/**
 * Данные ленты, общие для двух макетов.
 *
 * Мобильный и десктопный экраны различаются только вёрсткой; отбор, сортировка
 * и состояние фильтров у них одни и те же — и должны остаться одними.
 */
export function useFeedData(): FeedData {
  const { profile } = useAuth()
  const meId = profile?.id ?? null
  const { filters, setFilter, reset, activeCount } = useFilters()
  const { coords: here } = useGeolocation()

  const placesQuery = usePlaces()
  const categoriesQuery = useCategories()

  const all = useMemo(() => placesQuery.data ?? [], [placesQuery.data])
  const list = useMemo(() => selectPlaces(all, filters, meId, here), [all, filters, meId, here])
  const tagNames = useMemo(() => collectTags(all), [all])
  const ideas = useMemo(() => selectIdeas(all), [all])
  const sections = useMemo(() => groupByCategory(list), [list])

  // «Кто хочет» перечисляет тех, кто вообще заводил места. Пока их двое —
  // отдельного справочника людей не нужно.
  const people = useMemo<Profile[]>(() => {
    const seen = new Map<string, Profile>()
    all.forEach((place) => {
      if (place.author && !seen.has(place.author.id)) seen.set(place.author.id, place.author)
    })
    return [...seen.values()]
  }, [all])

  return {
    meId,
    me: profile,
    here,
    list,
    tagNames,
    sections,
    ideas,
    totalCount: all.filter((place) => !place.isIdea).length,
    categories: categoriesQuery.data ?? [],
    people,
    filters,
    setFilter,
    reset,
    activeCount,
    isPending: placesQuery.isPending,
    isError: placesQuery.isError,
    error: placesQuery.error,
  }
}
