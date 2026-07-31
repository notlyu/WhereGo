import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import type { PlaceStatus, PriceLevel } from '@/types/models'

export type SortKey = 'new' | 'rating' | 'alpha' | 'cheap' | 'pricey'
export type ViewKey = 'rails' | 'cards' | 'compact'
/** Кто хочет: любой · оба · конкретный автор (id профиля). */
export type WantKey = 'all' | 'both' | string

export interface Filters {
  q: string
  category: string | 'all'
  status: PlaceStatus | 'all'
  price: PriceLevel | 'all'
  want: WantKey
  sort: SortKey
  view: ViewKey
}

const DEFAULTS: Filters = {
  q: '',
  category: 'all',
  status: 'all',
  price: 'all',
  want: 'all',
  sort: 'new',
  view: 'rails',
}

/**
 * Л-6: состояние фильтров живёт в search-параметрах URL, а не в useState.
 * Тогда ссылка «смотри, что я нафильтровал» открывается у второго в том же виде,
 * а «назад» из карточки места возвращает ленту как была.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo<Filters>(
    () => ({
      q: params.get('q') ?? DEFAULTS.q,
      category: params.get('cat') ?? DEFAULTS.category,
      status: (params.get('status') as Filters['status']) ?? DEFAULTS.status,
      price: (params.get('price') as Filters['price']) ?? DEFAULTS.price,
      want: params.get('want') ?? DEFAULTS.want,
      sort: (params.get('sort') as SortKey) ?? DEFAULTS.sort,
      view: (params.get('view') as ViewKey) ?? DEFAULTS.view,
    }),
    [params],
  )

  const setFilter = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      const shortKey = { q: 'q', category: 'cat', status: 'status', price: 'price', want: 'want', sort: 'sort', view: 'view' }[key]
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value === DEFAULTS[key]) next.delete(shortKey)
          else next.set(shortKey, String(value))
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // Вид — не фильтр, «сбросить» его не трогает.
        ;['q', 'cat', 'status', 'price', 'want', 'sort'].forEach((key) => next.delete(key))
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const activeCount = useMemo(() => {
    let count = 0
    if (filters.q) count += 1
    if (filters.category !== 'all') count += 1
    if (filters.status !== 'all') count += 1
    if (filters.price !== 'all') count += 1
    if (filters.want !== 'all') count += 1
    if (filters.sort !== 'new') count += 1
    return count
  }, [filters])

  return { filters, setFilter, reset, activeCount }
}
