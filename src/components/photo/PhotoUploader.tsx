import { GripVertical, ImagePlus, Loader2, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'

import type { PhotoTarget } from '@/api/backend'
import { useAuth } from '@/hooks/auth-context'
import { useDeletePhoto, usePhotos, useReorderPhotos } from '@/hooks/queries'
import { useUploadPhotos } from '@/hooks/useUploadPhotos'
import { cn } from '@/lib/cn'
import { MAX_PHOTOS_PER_PLACE, type Photo } from '@/types/models'

import { moveItem, useDragSort } from './useDragSort'

interface Props {
  placeId: string
  /** Куда крепить новые файлы: к месту или к отзыву (Ф-8). */
  target: PhotoTarget
  desktop?: boolean
  /** Компактный вид для карточки отзыва: без заголовка и пояснения. */
  compact?: boolean
  /** Ф-7: открыть фото на весь экран. Без обработчика плитка не кликается. */
  onOpen?: (photoId: string) => void
}

/** Ф-1…Ф-6, Ф-8: до десяти фото, перетаскиванием или выбором, со статусом на файл. */
export function PhotoUploader({ placeId, target, desktop = false, compact = false, onOpen }: Props) {
  const { profile } = useAuth()
  const { data: photos = [] } = usePhotos(placeId)
  const remove = useDeletePhoto(placeId)
  const reorder = useReorderPhotos(placeId)
  const { items, busy, upload, clearDone } = useUploadPhotos(target, placeId)

  const inputRef = useRef<HTMLInputElement>(null)
  const [hovering, setHovering] = useState(false)

  // Загруженные показывает уже сам список фото — очередь чистим,
  // чтобы карточка не двоилась.
  useEffect(() => {
    if (!busy && items.some((item) => item.status === 'done')) clearDone()
  }, [busy, items, clearDone])

  // Запрос отдаёт фото места и фото всех его отзывов — берём только свою пачку.
  const stored = photos.filter((photo) =>
    target.placeId ? photo.placeId === target.placeId : photo.reviewId === target.reviewId,
  )

  // Ф-9: пока идёт запись, порядок держим у себя — иначе плитка возвращалась
  // бы на место при каждом обновлении запроса.
  const [order, setOrder] = useState<string[] | null>(null)
  // Тот же порядок в ref: перестановка и отправка случаются в одном такте,
  // и состояние к моменту отправки ещё не обновилось.
  const orderRef = useRef<string[] | null>(null)

  // Фото, которых нет в нашем порядке — только что загруженные, — дописываем
  // в конец. Без этого новый снимок не появился бы в сетке вовсе.
  const own = order
    ? [
        ...order.flatMap((id) => stored.filter((photo) => photo.id === id)),
        ...stored.filter((photo) => !order.includes(photo.id)),
      ]
    : stored
  const left = MAX_PHOTOS_PER_PLACE - own.length

  const { containerRef, dragging, handleProps, keyProps } = useDragSort({
    count: own.length,
    onMove: (from, to) => {
      const next = moveItem(own, from, to).map((photo) => photo.id)
      orderRef.current = next
      setOrder(next)
    },
    onCommit: () => {
      const ids = orderRef.current
      if (!ids) return
      reorder.mutate(ids, {
        // Список уже перечитан (см. `useReorderPhotos`) — свой порядок больше
        // не нужен. При сбое тем более: показываем то, что в базе, а не то,
        // что человек хотел получить.
        onSettled: () => {
          orderRef.current = null
          setOrder(null)
        },
      })
    },
  })
  const pending = items.filter((item) => item.status !== 'done')

  function accept(fileList: FileList | null) {
    if (!fileList) return
    const files = [...fileList].slice(0, Math.max(left, 0))
    if (files.length) void upload(files)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setHovering(false)
    accept(event.dataTransfer.files)
  }

  return (
    <div>
      {compact ? null : (
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="eyebrow">фото</div>
          <div className="text-xs text-fg-dimmer">
            {left > 0 ? `можно ещё ${left}` : `предел — ${MAX_PHOTOS_PER_PLACE}`}
          </div>
        </div>
      )}

      <div ref={containerRef} className={cn('grid gap-2.5', compact ? 'grid-cols-4' : 'grid-cols-3')}>
        {own.map((photo, index) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            index={index}
            cover={index === 0 && Boolean(target.placeId)}
            dragging={dragging === index}
            sortable={own.length > 1}
            handleProps={handleProps(index)}
            keyProps={keyProps(index)}
            canDelete={photo.uploadedBy === profile?.id}
            onDelete={() => remove.mutate(photo.id)}
            onOpen={onOpen ? () => onOpen(photo.id) : undefined}
          />
        ))}

        {pending.map((item) => (
          <div key={item.id} className="relative aspect-square overflow-hidden rounded-card bg-surface-2">
            <img src={item.previewUrl} alt="" className="h-full w-full object-cover opacity-40" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-2 text-center">
              {item.status === 'failed' ? (
                <>
                  <TriangleAlert size={16} className="text-[#FF7A6B]" />
                  <div className="text-[10.5px] leading-tight text-[#FF7A6B]">{item.error}</div>
                </>
              ) : (
                <>
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <div className="text-[10.5px] text-fg-muted">
                    {item.status === 'compressing' ? 'сжимаем' : 'отправляем'}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}

        {left > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setHovering(true)
            }}
            onDragLeave={() => setHovering(false)}
            onDrop={onDrop}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed px-2 text-center transition-colors',
              hovering ? 'border-accent bg-accent/5 text-accent' : 'border-border-4 text-fg-dimmer hover:border-accent hover:text-accent',
            )}
          >
            <ImagePlus size={compact ? 16 : 20} />
            {compact ? null : (
              <span className="font-mono text-[10.5px] leading-tight">
                {desktop ? 'перетащи сюда' : 'добавить'}
              </span>
            )}
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          accept(event.target.files)
          event.target.value = ''
        }}
      />

      {/* Ф-9: порядок не записался — плитка вернулась на место, и без этой
          строки было бы непонятно, почему. Молчаливый откат читается как
          «перетаскивание сломано», а не как «запрос не прошёл». */}
      {reorder.error ? (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-[#FF7A6B]">{orderError(reorder.error)}</div>
      ) : null}

      {compact ? null : (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-fg-dim">
          Ужимаем до 1600px и WebP прямо в браузере — в хранилище уходит около 200 КБ вместо трёх мегабайт.
          {own.length > 1 ? ' Порядок меняется перетаскиванием за уголок — первое фото становится обложкой.' : ''}
        </div>
      )}
    </div>
  )
}

function PhotoTile({
  photo,
  index,
  cover,
  dragging,
  sortable,
  handleProps,
  keyProps,
  canDelete,
  onDelete,
  onOpen,
}: {
  photo: Photo
  index: number
  /** Первая по порядку — обложка места. У фото отзыва обложки нет. */
  cover: boolean
  dragging: boolean
  sortable: boolean
  handleProps: Record<string, unknown>
  keyProps: Record<string, unknown>
  canDelete: boolean
  onDelete: () => void
  onOpen?: () => void
}) {
  return (
    <div
      data-sort-index={index}
      className={cn(
        'group relative aspect-square overflow-hidden rounded-card bg-surface-2 transition-transform',
        dragging && 'scale-[1.06] ring-2 ring-accent',
      )}
    >
      <img
        src={photo.url}
        alt=""
        loading="lazy"
        width={photo.width ?? undefined}
        height={photo.height ?? undefined}
        onClick={onOpen}
        className={cn('h-full w-full object-cover', onOpen && 'cursor-zoom-in')}
      />

      {/* Ф-9: обложку видно без объяснений — она подписана. */}
      {cover ? (
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-pill bg-accent px-2 py-1 text-[10px] font-bold text-on-accent">
          главное
        </div>
      ) : null}

      {sortable ? (
        <button
          type="button"
          aria-label={`Переставить фото ${index + 1}. Стрелки влево и вправо двигают его`}
          className="absolute bottom-1.5 right-1.5 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-pill bg-bg/70 text-fg-muted backdrop-blur-md transition-colors hover:text-fg active:cursor-grabbing"
          {...handleProps}
          {...keyProps}
        >
          <GripVertical size={13} />
        </button>
      ) : null}

      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Удалить фото"
          className="absolute top-1.5 right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill bg-bg/70 text-fg-muted backdrop-blur-md transition-colors hover:text-[#FF7A6B]"
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  )
}

/**
 * Понятная причина вместо кода ошибки PostgREST.
 *
 * Самый вероятный случай — в базе нет функции `set_photo_order`: код уехал
 * на боевой сайт, а миграция 0003 ещё не применялась. Снаружи это выглядит
 * как «перетаскивание не работает», хотя работает всё, кроме записи.
 */
function orderError(cause: unknown): string {
  const текст = cause instanceof Error ? cause.message : String(cause)
  if (/set_photo_order|PGRST202|function.*does not exist/i.test(текст)) {
    return 'Порядок не сохранён: в базе нет функции set_photo_order. Примените миграцию 0003_photo_order.sql в SQL Editor.'
  }
  return `Порядок не сохранён: ${текст}`
}
