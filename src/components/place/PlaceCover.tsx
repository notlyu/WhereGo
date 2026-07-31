import { cn } from '@/lib/cn'
import { PLACE_STATUS_LABEL, type Place } from '@/types/models'

import { STATUS_BADGE } from './status'

/**
 * Обложка места. Фото появятся на Этапе 2 — пока диагональная штриховка с
 * подписью «фото места», как в прототипе, а не серый прямоугольник.
 */
export function PlaceCover({
  place,
  height,
  label = 'фото места',
  className,
  /** На большой обложке десктопа плашки статуса нет — статус там рядом, в сегментах. */
  showStatus = true,
}: {
  place: Place
  height: number
  label?: string
  className?: string
  showStatus?: boolean
}) {
  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', place.coverUrl ? 'bg-surface-2' : 'hatch', className)}
      style={{ height }}
    >
      {place.coverUrl ? (
        <img src={place.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="font-mono text-[11px] tracking-[.06em] text-fg-dimmer uppercase">{label}</div>
      )}

      {showStatus ? (
        <div
          className={cn(
            'absolute top-3 right-3 rounded-pill px-3 py-[7px] text-xs font-semibold backdrop-blur-md',
            STATUS_BADGE[place.status],
          )}
        >
          {PLACE_STATUS_LABEL[place.status]}
        </div>
      ) : null}
    </div>
  )
}
