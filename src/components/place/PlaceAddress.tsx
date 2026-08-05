import { ArrowUpRight, MapPin } from 'lucide-react'

import { cn } from '@/lib/cn'
import { yandexMapsUrl } from '@/lib/geo'
import type { Place } from '@/types/models'

/**
 * Адрес места, он же ссылка в Яндекс Карты — оттуда строится маршрут.
 *
 * Ведём по координатам метки, а не по тексту адреса: адрес записан руками и
 * бывает неточным, а поиск по кривой строке уводит в другой район молча.
 * Без координат ссылки нет вовсе — остаётся простой текст: пусть адрес не
 * кликается, чем кликается и открывает не то место.
 */
export function PlaceAddress({ place, className }: { place: Place; className?: string }) {
  const hasPoint = place.lat !== null && place.lng !== null
  if (!place.address && !hasPoint) return null

  const label = place.address ?? 'показать в Яндекс Картах'

  if (!hasPoint) {
    return (
      <div className={cn('flex items-center gap-1.5 text-fg-muted', className)}>
        <MapPin size={13} className="flex-none opacity-70" />
        <span className="truncate">{label}</span>
      </div>
    )
  }

  return (
    <a
      href={yandexMapsUrl(place.lat as number, place.lng as number)}
      target="_blank"
      rel="noreferrer noopener"
      title="Открыть в Яндекс Картах"
      // `w-fit` — чтобы ссылка не забирала всю ширину строки и не перехватывала
      // клики по пустому месту справа от адреса. `relative` поднимает её над
      // растянутыми слоями-ссылками, если карточка целиком куда-то ведёт.
      className={cn(
        'relative flex w-fit max-w-full items-center gap-1.5 text-fg-muted transition-colors hover:text-accent',
        className,
      )}
    >
      <MapPin size={13} className="flex-none" />
      <span className="truncate">{label}</span>
      <ArrowUpRight size={13} className="flex-none opacity-70" />
    </a>
  )
}
