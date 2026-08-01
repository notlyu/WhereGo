import { LayoutGrid, List, Plus, Rows3, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { PlaceCard } from '@/components/place/PlaceCard'
import { PlaceCompactRow } from '@/components/place/PlaceCompactRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { cn } from '@/lib/cn'

import { FilterSheet } from './FilterSheet'
import type { FeedData } from './useFeedData'

const VIEW_ICON = { rails: Rows3, cards: LayoutGrid, compact: List } as const
const VIEW_CYCLE = { rails: 'cards', cards: 'compact', compact: 'rails' } as const

/** Лента на телефоне (< 900px) — по мобильному макету: полки, сегменты, шторка. */
export function MobileFeed(data: FeedData) {
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const { list, sections, filters, setFilter, activeCount, categories, meId } = data

  const activeCategory = categories.find((category) => category.id === filters.category)
  const filterLabel = `${activeCategory ? activeCategory.name : 'Все категории'} · ${list.length}`
  const ViewIcon = VIEW_ICON[filters.view]

  return (
    <div className="relative px-5">
      <div className="glow-accent pointer-events-none absolute -top-52 -right-20 -left-20 h-[400px]" />

      <header className="relative flex items-end justify-between gap-6 pt-3.5 pb-[18px]">
        <div>
          <div className="eyebrow">Санкт-Петербург</div>
          <h1 className="mt-1.5 font-display text-[38px] leading-none font-medium tracking-[-.02em] text-fg">Наши места</h1>
        </div>
        <Link
          to="/place/new"
          aria-label="Добавить место"
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <Plus size={22} />
        </Link>
      </header>

      <Segmented
        className="mb-4"
        value="places"
        onChange={(next) => {
          if (next === 'ideas') void navigate('/ideas')
        }}
        options={[
          { value: 'places', label: 'Места' },
          { value: 'ideas', label: 'Идеи' },
        ]}
      />

      <label className="mb-3 flex h-[46px] items-center gap-2.5 rounded-pill bg-surface-2 px-[18px]">
        <Search size={16} className="flex-none text-fg-dim" />
        <input
          value={filters.q}
          onChange={(event) => setFilter('q', event.target.value)}
          placeholder="Поиск по названию, описанию, адресу"
          className="w-full bg-transparent text-sm text-fg outline-none placeholder:text-fg-dim"
        />
      </label>

      <div className="mb-[18px] flex gap-2.5">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="flex h-[46px] flex-1 cursor-pointer items-center gap-2.5 rounded-pill bg-surface-2 px-[18px] transition-colors hover:bg-surface-4"
        >
          <SlidersHorizontal size={15} className={cn('flex-none', activeCount > 0 ? 'text-accent' : 'text-fg-muted')} />
          <span className="flex-1 truncate text-left text-sm font-semibold text-fg">{filterLabel}</span>
          <span className="text-[11px] text-fg-muted">▾</span>
        </button>
        <button
          type="button"
          aria-label="Сменить вид"
          onClick={() => setFilter('view', VIEW_CYCLE[filters.view])}
          className="flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-accent transition-colors hover:bg-surface-4"
        >
          <ViewIcon size={17} />
        </button>
      </div>

      {data.isPending ? (
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[300px] animate-pulse rounded-[20px] bg-surface-2" />
          ))}
        </div>
      ) : null}

      {data.isError ? (
        <EmptyState title="Не смогли загрузить ленту" hint={data.error instanceof Error ? data.error.message : undefined} />
      ) : null}

      {!data.isPending && !data.isError && list.length === 0 ? (
        <EmptyState
          title={activeCount > 0 ? 'Под фильтры ничего не подошло' : 'Мест пока нет'}
          hint={
            activeCount > 0 ? 'Сбрось фильтры или поищи по другому слову.' : 'Добавим первое — и лента перестанет быть пустой.'
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
      ) : null}

      {filters.view === 'cards' ? (
        <div className="flex flex-col gap-4">
          {list.map((place) => (
            <PlaceCard key={place.id} place={place} meId={meId} here={data.here} />
          ))}
        </div>
      ) : null}

      {filters.view === 'compact' ? (
        <div className="flex flex-col gap-2">
          {list.map((place) => (
            <PlaceCompactRow key={place.id} place={place} meId={meId} here={data.here} />
          ))}
        </div>
      ) : null}

      {filters.view === 'rails' ? (
        <div className="flex flex-col gap-7">
          {sections.map((section) => (
            <section key={section.categoryId}>
              <div className="flex items-baseline justify-between gap-3 pb-3">
                <h2 className="text-xs font-bold tracking-[.1em] text-fg uppercase">{section.label}</h2>
                {section.categoryId !== 'none' ? (
                  <button
                    type="button"
                    onClick={() => setFilter('category', section.categoryId)}
                    className="cursor-pointer text-[13.5px] font-semibold text-accent"
                  >
                    Все места
                  </button>
                ) : null}
              </div>
              <div className="rail -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
                {section.places.map((place) => (
                  <PlaceCard key={place.id} place={place} meId={meId} here={data.here} layout="rail" />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        setFilter={setFilter}
        reset={data.reset}
        activeCount={activeCount}
        categories={categories}
        people={data.people}
        meId={meId}
        resultCount={list.length}
      />
    </div>
  )
}
