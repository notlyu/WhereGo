import { ImagePlus, Loader2, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState, type DragEvent } from 'react'

import type { PhotoTarget } from '@/api/backend'
import { useAuth } from '@/hooks/auth-context'
import { useDeletePhoto, usePhotos } from '@/hooks/queries'
import { useUploadPhotos } from '@/hooks/useUploadPhotos'
import { cn } from '@/lib/cn'
import { MAX_PHOTOS_PER_PLACE, type Photo } from '@/types/models'

interface Props {
  placeId: string
  /** Куда крепить новые файлы: к месту или к отзыву (Ф-8). */
  target: PhotoTarget
  desktop?: boolean
  /** Компактный вид для карточки отзыва: без заголовка и пояснения. */
  compact?: boolean
}

/** Ф-1…Ф-6, Ф-8: до десяти фото, перетаскиванием или выбором, со статусом на файл. */
export function PhotoUploader({ placeId, target, desktop = false, compact = false }: Props) {
  const { profile } = useAuth()
  const { data: photos = [] } = usePhotos(placeId)
  const remove = useDeletePhoto(placeId)
  const { items, busy, upload, clearDone } = useUploadPhotos(target, placeId)

  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  // Загруженные показывает уже сам список фото — очередь чистим,
  // чтобы карточка не двоилась.
  useEffect(() => {
    if (!busy && items.some((item) => item.status === 'done')) clearDone()
  }, [busy, items, clearDone])

  // Запрос отдаёт фото места и фото всех его отзывов — берём только свою пачку.
  const own = photos.filter((photo) =>
    target.placeId ? photo.placeId === target.placeId : photo.reviewId === target.reviewId,
  )
  const left = MAX_PHOTOS_PER_PLACE - own.length
  const pending = items.filter((item) => item.status !== 'done')

  function accept(fileList: FileList | null) {
    if (!fileList) return
    const files = [...fileList].slice(0, Math.max(left, 0))
    if (files.length) void upload(files)
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
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

      <div className={cn('grid gap-2.5', compact ? 'grid-cols-4' : 'grid-cols-3')}>
        {own.map((photo) => (
          <PhotoTile
            key={photo.id}
            photo={photo}
            canDelete={photo.uploadedBy === profile?.id}
            onDelete={() => remove.mutate(photo.id)}
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
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed px-2 text-center transition-colors',
              dragging ? 'border-accent bg-accent/5 text-accent' : 'border-border-4 text-fg-dimmer hover:border-accent hover:text-accent',
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

      {compact ? null : (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-fg-dim">
          Ужимаем до 1600px и WebP прямо в браузере — в хранилище уходит около 200 КБ вместо трёх мегабайт.
        </div>
      )}
    </div>
  )
}

function PhotoTile({ photo, canDelete, onDelete }: { photo: Photo; canDelete: boolean; onDelete: () => void }) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-card bg-surface-2">
      <img
        src={photo.url}
        alt=""
        loading="lazy"
        width={photo.width ?? undefined}
        height={photo.height ?? undefined}
        className="h-full w-full object-cover"
      />
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
