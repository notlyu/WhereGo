import { cn } from '@/lib/cn'
import { isOpenNow, parseHours } from '@/lib/openingHours'
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
  /** Высота в пикселях. Без неё обложка тянется под родителя — так её ставит
   *  карточка свайпов, где высоту задаёт колода, а не сама обложка. */
  height?: number
  label?: string
  className?: string
  showStatus?: boolean
}) {
  return (
    <div
      className={cn('relative flex items-center justify-center overflow-hidden', place.coverUrl ? 'bg-surface-2' : 'hatch', className)}
      style={height === undefined ? undefined : { height }}
    >
      {place.coverUrl ? (
        <img src={place.coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="font-mono text-[11px] tracking-[.06em] text-fg-dimmer uppercase">{label}</div>
      )}

      {/* М-12: бейдж «работает» — только когда часы указаны и место открыто.
          Молчим, если часов нет: «закрыто» без данных было бы враньём. */}
      {isOpenNow(parseHours(place.openingHours)) ? (
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-pill bg-bg/72 px-2.5 py-1.5 text-[11.5px] font-semibold text-fg backdrop-blur-md">
          <span className="h-[5px] w-[5px] rounded-full bg-accent" />
          работает
        </div>
      ) : null}

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
