import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAllReviews, usePlaces } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatRating } from '@/lib/format'

import { selectVisits, selectYear, yearsWithVisits } from './select-history'

/** И-2: статистика за год и полосы по категориям. */
export function YearPage() {
  const isDesktop = useIsDesktop()
  const { data: places = [] } = usePlaces()
  const { data: reviews = [] } = useAllReviews()

  const visits = useMemo(() => selectVisits(places, reviews), [places, reviews])
  const years = useMemo(() => yearsWithVisits(visits), [visits])
  const [year, setYear] = useState<number | null>(null)

  const current = year ?? years[0] ?? new Date().getFullYear()
  const stats = useMemo(() => selectYear(visits, current), [visits, current])

  const running = current === new Date().getFullYear()

  return (
    <div className={cn(isDesktop ? '' : 'px-5 pt-3.5 pb-8')}>
      <header>
        <div className={cn('font-semibold tracking-[.1em] uppercase', isDesktop ? 'text-[11.5px] text-fg-muted' : 'eyebrow')}>
          итоги
        </div>
        <h1
          className={cn(
            'font-display font-medium tracking-[-.02em] text-fg',
            isDesktop ? 'mt-2 text-[44px] leading-none' : 'mt-1.5 text-[30px]',
          )}
        >
          Итоги года
        </h1>
      </header>

      {years.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {years.map((value) => (
            <Chip
              key={value}
              size="sm"
              tone={isDesktop ? 'contrast' : 'accent'}
              active={value === current}
              onClick={() => setYear(value)}
            >
              {value}
            </Chip>
          ))}
        </div>
      ) : null}

      {stats.visits === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="За этот год пока пусто"
            hint="Итоги собираются сами: как только сходим куда-нибудь и отметим место как «были», здесь появятся цифры."
            action={
              <Link to="/history" className="text-sm font-semibold text-accent">
                Открыть «Мы были тут»
              </Link>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-baseline gap-4 border-b border-border pb-[22px]">
            <div className="font-display text-[56px] leading-none font-medium tracking-[-.03em] text-accent">
              {stats.visits}
            </div>
            <div className="text-base text-fg-body">{plural(stats.visits)} вдвоём</div>
            <div className="ml-auto text-[12.5px] text-fg-dimmer">
              {current}
              {running ? ', пока что' : ''}
            </div>
          </div>

          <div className="mt-[22px] grid gap-y-5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
            <Stat label="разных мест" value={String(stats.places)} note={stats.places < stats.visits ? 'куда-то возвращались' : 'каждое по разу'} />
            <Stat label="отзывов" value={String(stats.reviews)} note={stats.reviews >= stats.visits * 2 ? 'писали оба' : 'не про всё написали'} />
            <Stat
              label="средняя оценка"
              value={stats.averageRating !== null ? formatRating(stats.averageRating) : '—'}
              note={stats.averageRating !== null ? 'по нашим отзывам' : 'оценок пока нет'}
            />
            <Stat
              label="лучшее"
              value={stats.best?.title ?? '—'}
              note={stats.best ? (stats.best.category?.name ?? 'без категории') : 'ещё не выбрали'}
            />
          </div>

          <div className="mt-[34px] max-w-[560px]">
            <div className="text-[11px] font-semibold tracking-[.1em] text-fg-dimmer uppercase">куда ходим чаще</div>
            <div className="mt-3.5 flex flex-col gap-3">
              {stats.byCategory.map((bar) => (
                <div key={bar.label} className="flex items-center gap-3.5">
                  <div className="w-[88px] flex-none truncate text-[13px] text-fg-muted">{bar.label}</div>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-pill bg-border">
                    <div
                      className="h-full rounded-pill bg-accent transition-[width] duration-500"
                      style={{ width: `${Math.max(bar.share * 100, 4)}%` }}
                    />
                  </div>
                  <div className="w-5 flex-none text-right text-[12.5px] text-fg-dimmer">{bar.count}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="pr-6">
      <div className="text-[11px] font-semibold tracking-[.1em] text-fg-dimmer uppercase">{label}</div>
      <div className="mt-2 truncate font-display text-[26px] leading-[1.1] font-medium text-fg">{value}</div>
      <div className="mt-1.5 text-[12.5px] text-fg-dim">{note}</div>
    </div>
  )
}

function plural(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'походов'
  const mod10 = n % 10
  if (mod10 === 1) return 'поход'
  if (mod10 >= 2 && mod10 <= 4) return 'похода'
  return 'походов'
}
