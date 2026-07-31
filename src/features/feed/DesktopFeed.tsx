import { useState } from 'react'
import { Link } from 'react-router'

import { PlaceCard } from '@/components/place/PlaceCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'

import { DesktopFilters } from './DesktopFilters'
import type { FeedData } from './useFeedData'

/**
 * Лента на десктопе (≥ 900px) — по отдельному макету «Куда пойти - десктоп»:
 * сетка карточек вместо горизонтальных полок, счётчик и переключатель фильтров
 * в шапке, панель фильтров раскрывается на месте.
 */
export function DesktopFeed(data: FeedData) {
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { list, totalCount, activeCount } = data

  return (
    <div>
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">лента мест</div>
          <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Наши места</h1>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="text-[13.5px] text-fg-dim">
            {list.length} из {totalCount} мест
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className={cn(
              'cursor-pointer rounded-pill bg-surface-d px-4 py-2.5 text-[13px] font-semibold transition-colors hover:bg-surface-2',
              filtersOpen || activeCount > 0 ? 'text-accent' : 'text-fg-muted',
            )}
          >
            {filtersOpen ? 'скрыть фильтры' : 'фильтры'}
          </button>
        </div>
      </header>

      {filtersOpen ? <DesktopFilters {...data} /> : null}

      {data.isPending ? (
        <div className="mt-[26px] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="h-[340px] animate-pulse rounded-[22px] bg-surface-d" />
          ))}
        </div>
      ) : null}

      {data.isError ? (
        <div className="mt-[26px]">
          <EmptyState
            title="Не смогли загрузить ленту"
            hint={data.error instanceof Error ? data.error.message : undefined}
          />
        </div>
      ) : null}

      {!data.isPending && !data.isError && list.length === 0 ? (
        <div className="mt-[26px]">
          <EmptyState
            title={activeCount > 0 ? 'Под фильтры ничего не подошло' : 'Мест пока нет'}
            hint={
              activeCount > 0
                ? 'Сбрось фильтры или поищи по другому слову.'
                : 'Добавим первое — и лента перестанет быть пустой.'
            }
            action={
              activeCount > 0 ? (
                <button type="button" onClick={data.reset} className="cursor-pointer text-sm font-semibold text-accent">
                  ↺ сбросить фильтры
                </button>
              ) : (
                <Link to="/place/new" className="text-sm font-semibold text-accent">
                  Добавить место
                </Link>
              )
            }
          />
        </div>
      ) : null}

      <div className="mt-[26px] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
        {list.map((place) => (
          <PlaceCard key={place.id} place={place} meId={data.meId} layout="grid" />
        ))}
      </div>
    </div>
  )
}
