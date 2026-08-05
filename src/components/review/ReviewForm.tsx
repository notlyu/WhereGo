import { ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { PhotoUploader } from '@/components/photo/PhotoUploader'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { MAX_PHOTOS_PER_PLACE, type Review, type ReviewInput } from '@/types/models'

import { StarsInput } from './Stars'

interface Props {
  /** Существующий отзыв — тогда форма правит его, а не заводит новый (О-7). */
  review: Review | null
  desktop?: boolean
  saving: boolean
  error: unknown
  /** `files` непусты только у нового отзыва: их грузят после сохранения (Ф-8). */
  onSave: (input: ReviewInput, files: File[]) => void
  onCancel: () => void
}

/** О-2, Ф-8: оценка 1–5, текст, дата посещения и фото. */
export function ReviewForm({ review, desktop = false, saving, error, onSave, onCancel }: Props) {
  const [rating, setRating] = useState(review?.rating ?? 5)
  const [text, setText] = useState(review?.text ?? '')
  const [visitedAt, setVisitedAt] = useState(review?.visitedAt ?? today())
  const [files, setFiles] = useState<File[]>([])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ rating, text: text.trim() || null, visitedAt: visitedAt || null }, files)
      }}
      className={cn('animate-pop rounded-[20px]', desktop ? 'bg-surface-d p-5' : 'bg-surface-2 p-4')}
    >
      <div className="eyebrow">как оно вышло</div>
      <div className="mt-3">
        <StarsInput value={rating} onChange={setRating} />
      </div>

      <div className="mt-5 eyebrow">что запомнилось</div>
      <Textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Пара строк, чтобы через год вспомнить, как было"
        className={cn('mt-2.5', desktop && 'bg-well')}
      />

      <div className="mt-5 eyebrow">когда были</div>
      <input
        type="date"
        value={visitedAt}
        max={today()}
        onChange={(event) => setVisitedAt(event.target.value)}
        className={cn(
          'mt-2.5 h-[54px] w-full rounded-card px-[18px] text-[15px] text-fg outline-none focus:ring-1 focus:ring-border-3',
          desktop ? 'bg-well' : 'bg-surface-1',
        )}
      />

      {/* Ф-8: фото прямо в форме — момент, когда о них вспоминают.
          У готового отзыва id уже есть, и файл уходит сразу; у нового
          крепить пока не к чему, поэтому файлы ждут сохранения. */}
      <div className="mt-5">
        {review ? (
          <PhotoUploader placeId={review.placeId} target={{ reviewId: review.id }} desktop={desktop} />
        ) : (
          <PendingPhotos files={files} onChange={setFiles} desktop={desktop} />
        )}
      </div>

      {error ? (
        <div className="mt-4 text-[13.5px] text-[#FF7A6B]">
          {error instanceof Error ? error.message : 'Не получилось сохранить отзыв'}
        </div>
      ) : null}

      <div className="mt-5 flex gap-2.5">
        <Button type="submit" size="md" disabled={saving} className="flex-1">
          {saving ? 'Сохраняем…' : review ? 'Сохранить' : 'Оставить отзыв'}
        </Button>
        <Button type="button" size="md" variant="surface" onClick={onCancel} className="bg-surface-3 text-fg-muted">
          Отмена
        </Button>
      </div>
    </form>
  )
}

/** Выбранные, но ещё не отправленные файлы нового отзыва. */
function PendingPhotos({
  files,
  onChange,
  desktop,
}: {
  files: File[]
  onChange: (next: File[]) => void
  desktop: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  const left = MAX_PHOTOS_PER_PLACE - files.length

  // Превью — ссылки на объекты в памяти вкладки. Браузер сам их не отпустит:
  // отзываем на каждой смене набора и при уходе с формы, иначе картинки
  // висят до перезагрузки страницы.
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="eyebrow">фото</div>
        <div className="text-xs text-fg-dimmer">
          {left > 0 ? `можно ещё ${left}` : `предел — ${MAX_PHOTOS_PER_PLACE}`}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="relative aspect-square overflow-hidden rounded-card bg-surface-1">
            {previews[index] ? <img src={previews[index]} alt="" className="h-full w-full object-cover" /> : null}
            <button
              type="button"
              onClick={() => onChange(files.filter((_, i) => i !== index))}
              aria-label={`Убрать ${file.name}`}
              className="absolute top-1.5 right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill bg-bg/70 text-fg-muted backdrop-blur-md transition-colors hover:text-[#FF7A6B]"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {left > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-border-4 px-2 text-center text-fg-dimmer transition-colors hover:border-accent hover:text-accent"
          >
            <ImagePlus size={20} />
            <span className="font-mono text-[10.5px] leading-tight">{desktop ? 'выбрать' : 'добавить'}</span>
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
          const picked = [...(event.target.files ?? [])].slice(0, Math.max(left, 0))
          if (picked.length) onChange([...files, ...picked])
          event.target.value = ''
        }}
      />

      {files.length ? (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-fg-dim">
          Отправим после сохранения — фото крепится к отзыву, а его ещё нет.
        </div>
      ) : null}
    </div>
  )
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
