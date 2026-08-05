import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import type { Photo } from '@/types/models'

interface Props {
  photos: Photo[]
  /** Индекс открытого фото; null — просмотрщик закрыт. */
  index: number | null
  onClose: () => void
  title: string
}

/** Ф-7: полноэкранный просмотр — свайп, точки, «фото 1 из 4». */
export function PhotoViewer({ photos, index, onClose, title }: Props) {
  const [current, setCurrent] = useState(index ?? 0)
  const touchStart = useRef<number | null>(null)

  useEffect(() => {
    if (index !== null) setCurrent(index)
  }, [index])

  const go = useCallback(
    (delta: number) => {
      setCurrent((prev) => {
        const next = prev + delta
        // По кругу: на последнем фото «вперёд» возвращает к первому.
        if (next < 0) return photos.length - 1
        if (next >= photos.length) return 0
        return next
      })
    },
    [photos.length],
  )

  useEffect(() => {
    if (index === null) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') go(-1)
      if (event.key === 'ArrowRight') go(1)
    }

    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [index, onClose, go])

  if (index === null || photos.length === 0) return null
  const photo = photos[current] ?? photos[0]

  return (
    <div
      className="animate-pop fixed inset-0 z-50 flex flex-col bg-[#080808]/97 px-4 pt-13 pb-6"
      // Свайп пальцем: на телефоне это основной способ листать.
      onTouchStart={(event) => (touchStart.current = event.touches[0].clientX)}
      onTouchEnd={(event) => {
        if (touchStart.current === null) return
        const delta = event.changedTouches[0].clientX - touchStart.current
        if (Math.abs(delta) > 50) go(delta > 0 ? -1 : 1)
        touchStart.current = null
      }}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-fg">{title}</div>
          <div className="mt-0.5 text-xs text-fg-dim">
            фото {current + 1} из {photos.length}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex h-10 w-10 flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <X size={16} />
        </button>
      </div>

      <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden rounded-3xl bg-surface-2">
        <img src={photo.url} alt="" className="max-h-full max-w-full object-contain" />

        {photos.length > 1 ? (
          <>
            <Arrow side="left" onClick={() => go(-1)} />
            <Arrow side="right" onClick={() => go(1)} />
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <div className="mt-4 flex justify-center gap-1.5">
          {photos.map((item, position) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrent(position)}
              aria-label={`Фото ${position + 1}`}
              className={cn(
                'h-1 cursor-pointer rounded-pill transition-all',
                position === current ? 'w-6 bg-fg' : 'w-1.5 bg-surface-4 hover:bg-fg-dimmer',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Arrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Предыдущее фото' : 'Следующее фото'}
      className={cn(
        'absolute top-1/2 flex h-12 w-12 -translate-y-1/2 cursor-pointer items-center justify-center rounded-pill bg-bg/70 text-fg backdrop-blur-md transition-colors hover:bg-bg',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      {side === 'left' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </button>
  )
}
