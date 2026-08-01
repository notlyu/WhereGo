import { Crosshair } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { Link } from 'react-router'

import { STATUS_OPTIONS } from '@/components/place/status'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFeedData } from '@/features/feed/useFeedData'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatDistance, haversine } from '@/lib/geo'
import { PLACE_STATUS_LABEL, PRICE_SHORT, type Place } from '@/types/models'

// ⚠️ MapLibre весит больше половины бюджета бандла (П-1). Держим его в
// отдельном чанке — иначе лента платила бы за карту при каждом открытии.
const MapCanvas = lazy(() => import('./MapCanvas').then((m) => ({ default: m.MapCanvas })))

export function MapPage() {
  const isDesktop = useIsDesktop()
  const { list, filters, setFilter } = useFeedData()
  const { coords, error: geoError, busy: locating, locate } = useGeolocation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  // К-6: на карте те же места, что в ленте, — фильтры общие.
  // К-1: без координат маркера не поставить.
  const onMap = useMemo(() => list.filter((place) => place.lat !== null && place.lng !== null), [list])

  const selected = onMap.find((place) => place.id === selectedId) ?? null
  const withoutCoords = list.length - onMap.length

  const legend = (
    <div className="flex gap-2">
      <Chip
        size="sm"
        tone={isDesktop ? 'contrast' : 'accent'}
        active={filters.status === 'all'}
        onClick={() => setFilter('status', 'all')}
      >
        все
      </Chip>
      {STATUS_OPTIONS.map((option) => (
        <Chip
          key={option.value}
          size="sm"
          tone={isDesktop ? 'contrast' : 'accent'}
          active={filters.status === option.value}
          onClick={() => setFilter('status', option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </div>
  )

  const canvas = (
    <Suspense fallback={<div className="h-full w-full animate-pulse bg-surface-1" />}>
      <MapCanvas
        places={onMap}
        selectedId={selectedId}
        onSelect={setSelectedId}
        me={coords}
        onError={setMapError}
        // Стиль тайлов светлый, приложение тёмное — притемняем фильтром.
        className="h-full w-full [filter:invert(1)_hue-rotate(180deg)_brightness(.92)_contrast(.9)_saturate(.75)]"
      />
    </Suspense>
  )

  // Тайлы приходят по сети со стороннего сервиса. Молча показывать чёрный
  // прямоугольник нельзя: непонятно, то ли мест нет, то ли карта не открылась.
  const errorBanner = mapError ? (
    <div className="absolute inset-x-4 top-4 z-10 rounded-card bg-surface-2/95 px-4 py-3 text-[13px] leading-relaxed text-[#FF7A6B] backdrop-blur-md">
      Карта не загрузилась: {mapError}. Проверьте связь — тайлы отдаёт OpenFreeMap.
    </div>
  ) : null

  const locateButton = (
    <button
      type="button"
      onClick={locate}
      disabled={locating}
      aria-label="Показать, где я"
      title={geoError ?? 'Показать, где я'}
      className={cn(
        'absolute z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-pill bg-surface-2/85 text-fg backdrop-blur-md transition-colors hover:bg-surface-4 disabled:opacity-50',
        geoError && 'text-[#FF7A6B]',
      )}
      style={{ right: 16, top: isDesktop ? 16 : 72 }}
    >
      <Crosshair size={18} />
    </button>
  )

  // ── Десктоп: список слева, карта справа ─────────────────────────────────
  if (isDesktop) {
    return (
      <div>
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">карта</div>
            <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Что рядом</h1>
          </div>
          {legend}
        </header>

        <div className="mt-6 grid items-start gap-5 grid-cols-[minmax(240px,320px)_minmax(360px,1fr)]">
          <div className="flex max-h-[620px] flex-col gap-2 overflow-y-auto pr-1">
            {onMap.map((place) => (
              <MapRow
                key={place.id}
                place={place}
                active={place.id === selectedId}
                me={coords}
                onClick={() => setSelectedId(place.id)}
              />
            ))}
            {onMap.length === 0 ? <EmptyState title="Мест с координатами нет" hint={hint(withoutCoords)} /> : null}
          </div>

          <div className="relative h-[620px] overflow-hidden rounded-3xl bg-surface-1">
            {canvas}
            {errorBanner}
            {locateButton}
            {selected ? (
              <MiniCard place={selected} me={coords} className="absolute bottom-6 left-6 w-[360px]" desktop />
            ) : null}
          </div>
        </div>

        {withoutCoords > 0 && onMap.length > 0 ? (
          <div className="mt-3 text-[13px] text-fg-dim">{hint(withoutCoords)}</div>
        ) : null}
      </div>
    )
  }

  // ── Телефон: карта во весь экран, легенда сверху, карточка снизу ────────
  return (
    <div className="relative h-[calc(100vh-140px)]">
      {canvas}
      {errorBanner}
      {locateButton}

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-bg to-transparent px-5 pt-3.5 pb-8">
        <div className="pointer-events-auto overflow-x-auto rail">{legend}</div>
      </div>

      {selected ? <MiniCard place={selected} me={coords} className="absolute inset-x-4 bottom-4" /> : null}

      {onMap.length === 0 ? (
        <div className="absolute inset-x-5 top-24">
          <EmptyState title="Мест с координатами нет" hint={hint(withoutCoords)} />
        </div>
      ) : null}
    </div>
  )
}

function hint(withoutCoords: number): string {
  return withoutCoords > 0
    ? `${withoutCoords} мест без координат — их можно поставить в форме места, поиском по адресу.`
    : 'Добавьте место с адресом — оно появится на карте.'
}

/** К-3: мини-карточка по клику, с неё переход на место. */
function MiniCard({
  place,
  me,
  className,
  desktop = false,
}: {
  place: Place
  me: { lat: number; lng: number } | null
  className?: string
  desktop?: boolean
}) {
  return (
    <Link
      to={`/place/${place.id}`}
      className={cn(
        'animate-pop flex gap-3.5 rounded-[20px] p-3.5 transition-colors',
        desktop ? 'bg-surface-d hover:bg-surface-2' : 'bg-surface-2 hover:bg-surface-4',
        className,
      )}
    >
      {place.coverUrl ? (
        <img src={place.coverUrl} alt="" className="h-20 w-20 flex-none rounded-[14px] object-cover" />
      ) : (
        <div className="hatch-sm h-20 w-20 flex-none rounded-[14px]" />
      )}

      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-[21px] font-medium text-fg">{place.title}</div>
        <div className="mt-1.5 truncate text-[13px] text-fg-muted">{meta(place, me)}</div>
        <div className="mt-3 flex items-center gap-2">
          <div className="rounded-pill bg-surface-4 px-2.5 py-1.5 text-xs font-semibold text-fg">
            {PLACE_STATUS_LABEL[place.status]}
          </div>
          <div className="text-xs font-semibold text-accent">открыть →</div>
        </div>
      </div>
    </Link>
  )
}

function MapRow({
  place,
  active,
  me,
  onClick,
}: {
  place: Place
  active: boolean
  me: { lat: number; lng: number } | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-card p-3 text-left transition-colors',
        active ? 'bg-surface-2' : 'bg-surface-d hover:bg-surface-2',
      )}
    >
      {place.coverUrl ? (
        <img src={place.coverUrl} alt="" className="h-13 w-13 flex-none rounded-xl object-cover" />
      ) : (
        <div className="hatch-sm h-13 w-13 flex-none rounded-xl" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px] font-semibold text-fg">{place.title}</div>
        <div className="mt-1 truncate text-[12.5px] text-fg-muted">{meta(place, me)}</div>
      </div>
      <div
        className="h-2.5 w-2.5 flex-none rounded-full"
        style={{ background: { want: '#4EE560', visited: '#9A9A9A', rejected: '#5C5C5C' }[place.status] }}
      />
    </button>
  )
}

/** М-13: расстояние появляется, только когда разрешена геопозиция. */
function meta(place: Place, me: { lat: number; lng: number } | null): string {
  const parts = [place.category?.name, place.price ? PRICE_SHORT[place.price] : null]

  if (me && place.lat !== null && place.lng !== null) {
    parts.push(formatDistance(haversine(me.lat, me.lng, place.lat, place.lng)))
  }

  return parts.filter(Boolean).join(' · ')
}
