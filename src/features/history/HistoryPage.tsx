import { useMemo } from 'react'
import { Link } from 'react-router'

import { PlaceCover } from '@/components/place/PlaceCover'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAllReviews, usePlaces } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatDate, formatRating } from '@/lib/format'

import { selectVisits, type Visit } from './select-history'

/** И-1: хронология походов со счётчиком. */
export function HistoryPage() {
  const isDesktop = useIsDesktop()
  const { data: places = [], isPending: loadingPlaces } = usePlaces()
  const { data: reviews = [], isPending: loadingReviews } = useAllReviews()

  const visits = useMemo(() => selectVisits(places, reviews), [places, reviews])
  const loading = loadingPlaces || loadingReviews

  return (
    <div className={cn(isDesktop ? '' : 'px-5 pt-3.5 pb-8')}>
      <header>
        <div
          className={cn(
            'font-semibold tracking-[.1em] uppercase',
            isDesktop ? 'text-[11.5px] text-fg-muted' : 'eyebrow',
          )}
        >
          {visits.length > 0 ? `${visits.length} ${plural(visits.length)}` : 'история посещений'}
        </div>
        <h1
          className={cn(
            'font-display font-medium tracking-[-.02em] text-fg',
            isDesktop ? 'mt-2 text-[44px] leading-none' : 'mt-1.5 text-[30px]',
          )}
        >
          Мы были тут
        </h1>
      </header>

      {loading ? (
        <div className={cn('mt-6 grid gap-5', isDesktop ? 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]' : 'grid-cols-1')}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-[300px] animate-pulse rounded-[22px] bg-surface-2" />
          ))}
        </div>
      ) : visits.length > 0 ? (
        <div className={cn('mt-6 grid gap-5', isDesktop ? 'grid-cols-[repeat(auto-fill,minmax(300px,1fr))]' : 'grid-cols-1')}>
          {visits.map((visit) => (
            <VisitCard key={visit.place.id} visit={visit} desktop={isDesktop} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState
            title="Мы ещё никуда не сходили"
            hint="Как только место переведём в «были», оно появится здесь — с датой и тем, что мы о нём подумали."
            action={
              <Link to="/" className="text-sm font-semibold text-accent">
                Вернуться в ленту
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}

function VisitCard({ visit, desktop }: { visit: Visit; desktop: boolean }) {
  const { place } = visit

  return (
    <Link
      to={`/place/${place.id}`}
      className={cn(
        'animate-pop block overflow-hidden rounded-[22px] transition-colors',
        desktop ? 'bg-surface-d hover:bg-surface-2' : 'bg-surface-2 hover:bg-surface-4',
      )}
    >
      <div className="relative">
        <PlaceCover place={place} height={180} showStatus={false} label="фото пока нет" />
        {visit.rating !== null ? (
          <div className="absolute top-3 right-3 rounded-pill bg-bg/70 px-3 py-[7px] text-xs font-semibold text-accent backdrop-blur-md">
            {formatRating(visit.rating)}
          </div>
        ) : null}
      </div>

      <div className="px-5 pt-[18px] pb-5">
        <div className="text-xs font-semibold tracking-[.08em] text-fg-dim uppercase">{formatDate(visit.date)}</div>
        <div className="mt-2 font-display text-[23px] leading-tight font-medium text-fg">{place.title}</div>
        <div className="mt-2 text-[13.5px] text-fg-muted">
          {/* Отзывов может не быть: сходили, а записать не успели. */}
          {visit.reviews.length > 0
            ? `${place.category?.name ?? 'без категории'} · ${visit.reviews.length === 2 ? 'оба написали' : 'один отзыв'}`
            : `${place.category?.name ?? 'без категории'} · отзывов нет`}
        </div>
      </div>
    </Link>
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
