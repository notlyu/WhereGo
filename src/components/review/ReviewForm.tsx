import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { Review, ReviewInput } from '@/types/models'

import { StarsInput } from './Stars'

interface Props {
  /** Существующий отзыв — тогда форма правит его, а не заводит новый (О-7). */
  review: Review | null
  desktop?: boolean
  saving: boolean
  error: unknown
  onSave: (input: ReviewInput) => void
  onCancel: () => void
}

/** О-2: оценка 1–5, текст, дата посещения. Фото добавятся вместе с R2 (Ф-8). */
export function ReviewForm({ review, desktop = false, saving, error, onSave, onCancel }: Props) {
  const [rating, setRating] = useState(review?.rating ?? 5)
  const [text, setText] = useState(review?.text ?? '')
  const [visitedAt, setVisitedAt] = useState(review?.visitedAt ?? today())

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        onSave({ rating, text: text.trim() || null, visitedAt: visitedAt || null })
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

function today(): string {
  return new Date().toISOString().slice(0, 10)
}
