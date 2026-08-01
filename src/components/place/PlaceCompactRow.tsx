import { Link } from 'react-router'

import { cn } from '@/lib/cn'
import { formatRating } from '@/lib/format'
import { formatDistance, haversine } from '@/lib/geo'
import { PRICE_SHORT, type Place } from '@/types/models'

import { STATUS_DOT } from './status'
import { WantLabel } from './WantLabel'

/** Л-8: компактный список — то же место одной строкой. */
export function PlaceCompactRow({
  place,
  meId,
  here = null,
}: {
  place: Place
  meId: string | null
  here?: { lat: number; lng: number } | null
}) {
  const distance =
    here && place.lat !== null && place.lng !== null
      ? formatDistance(haversine(here.lat, here.lng, place.lat, place.lng))
      : null

  const meta = [place.category?.name, place.price ? PRICE_SHORT[place.price] : null, distance, formatRating(place.rating) || null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Link
      to={`/place/${place.id}`}
      className="animate-pop flex items-center gap-3.5 rounded-card bg-surface-2 p-3 transition-colors hover:bg-surface-4"
    >
      {place.coverUrl ? (
        <img src={place.coverUrl} alt="" loading="lazy" className="h-14 w-14 flex-none rounded-xl object-cover" />
      ) : (
        <div className="hatch-sm h-14 w-14 flex-none rounded-xl" />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate text-[15.5px] font-semibold text-fg">{place.title}</div>
        <div className="mt-1 truncate text-[12.5px] text-fg-muted">{meta || 'без категории'}</div>
      </div>

      <WantLabel place={place} meId={meId} />
      <div className={cn('h-2.5 w-2.5 flex-none rounded-full', STATUS_DOT[place.status])} />
    </Link>
  )
}
