import { Link } from 'react-router'

import { cn } from '@/lib/cn'
import { formatRating } from '@/lib/format'
import { formatDistance, haversine } from '@/lib/geo'
import { PRICE_SHORT, type Place } from '@/types/models'

import { PlaceCover } from './PlaceCover'
import { WantLabel } from './WantLabel'

interface Props {
  place: Place
  meId: string | null
  /** М-13: геопозиция, если разрешена. Без неё расстояние просто не рисуем. */
  here?: { lat: number; lng: number } | null
  /**
   * `rail` — узкая карточка горизонтальной полки (телефон),
   * `full` — во всю ширину колонки (телефон, вид «карточки»),
   * `grid` — ячейка сетки десктопа: темнее, крупнее радиус, обложка 210px.
   */
  layout?: 'full' | 'rail' | 'grid'
}

export function PlaceCard({ place, meId, here = null, layout = 'full' }: Props) {
  const distance = distanceTo(place, here)
  const rail = layout === 'rail'
  const grid = layout === 'grid'

  return (
    <Link
      to={`/place/${place.id}`}
      className={cn(
        'animate-pop block overflow-hidden transition-colors',
        grid ? 'rounded-[22px] bg-surface-d hover:bg-surface-2' : 'rounded-[20px] bg-surface-2 hover:bg-surface-4',
        rail && 'w-[250px] flex-none snap-start',
      )}
    >
      <PlaceCover place={place} height={grid ? 210 : rail ? 172 : 200} />

      <div className={cn(grid ? 'px-5 pt-[18px] pb-5' : rail ? 'px-4 pt-3.5 pb-4' : 'px-[18px] pt-4 pb-[18px]')}>
        <div
          className={cn(
            'font-display font-medium text-fg',
            rail ? 'min-h-12 text-[21px] leading-[1.15] tracking-[-.01em]' : 'text-2xl leading-[1.15]',
          )}
        >
          {place.title}
        </div>

        {rail ? (
          <>
            <div className="mt-1.5 flex">
              <WantLabel place={place} meId={meId} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-fg-muted">
              <div>{place.price ? PRICE_SHORT[place.price] : '—'}</div>
              {distance ? (
                <>
                  <div className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
                  <div>{distance}</div>
                </>
              ) : null}
              <div className="flex-1" />
              <div className="font-semibold whitespace-nowrap">{formatRating(place.rating)}</div>
            </div>
          </>
        ) : (
          <>
            {/* На десктопе «кто хочет» стоит сразу под названием, на телефоне —
                под метаданными. Порядок разный в двух макетах. */}
            {grid ? (
              <div className="mt-2 flex min-h-4">
                <WantLabel place={place} meId={meId} />
              </div>
            ) : null}

            <div className={cn('flex flex-wrap items-center gap-2.5 text-[13.5px] text-fg-muted', grid ? 'mt-2.5' : 'mt-2')}>
              <div>{place.category?.name ?? 'без категории'}</div>
              {place.price ? (
                <>
                  <div className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
                  <div>{PRICE_SHORT[place.price]}</div>
                </>
              ) : null}
              {distance ? (
                <>
                  <div className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
                  <div>{distance}</div>
                </>
              ) : null}
              {grid ? (
                <>
                  <div className="flex-1" />
                  <div className="font-semibold">{formatRating(place.rating)}</div>
                </>
              ) : place.rating !== null ? (
                <>
                  <div className="h-[3px] w-[3px] rounded-full bg-fg-faint" />
                  <div>{formatRating(place.rating)}</div>
                </>
              ) : null}
            </div>

            {grid ? null : (
              <div className="mt-3.5 flex items-center">
                <WantLabel place={place} meId={meId} />
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  )
}

/** М-13: расстояние по прямой. Показываем, только когда есть обе точки. */
function distanceTo(place: Place, here: { lat: number; lng: number } | null): string | null {
  if (!here || place.lat === null || place.lng === null) return null
  return formatDistance(haversine(here.lat, here.lng, place.lat, place.lng))
}
