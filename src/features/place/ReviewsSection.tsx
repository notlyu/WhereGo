import { useState } from 'react'

import { ReviewCard } from '@/components/review/ReviewCard'
import { ReviewForm } from '@/components/review/ReviewForm'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/auth-context'
import { useDeleteReview, usePhotos, useReviews, useSaveReview } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Place } from '@/types/models'

/**
 * О-1…О-7. Отзывы живут прямо на карточке места, отдельного экрана нет:
 * их всего два, и уводить ради них на другую страницу незачем (О-7).
 */
export function ReviewsSection({ place, desktop = false }: { place: Place; desktop?: boolean }) {
  const { profile } = useAuth()
  const meId = profile?.id ?? null

  const { data: reviews = [], isPending } = useReviews(place.id)
  const { data: photos = [] } = usePhotos(place.id)
  const save = useSaveReview(place.id)
  const remove = useDeleteReview(place.id)
  const [editing, setEditing] = useState(false)

  const mine = reviews.find((review) => review.authorId === meId) ?? null
  const others = reviews.filter((review) => review.authorId !== meId)

  async function onDelete(id: string) {
    if (!confirm('Удалить свой отзыв? Отменить будет нельзя.')) return
    await remove.mutateAsync(id)
    setEditing(false)
  }

  if (isPending) {
    return <div className={cn('h-28 animate-pulse rounded-[20px]', desktop ? 'bg-surface-d' : 'bg-surface-2')} />
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Пустое состояние — формулировка из ТЗ (С-4), не «нет данных». */}
      {reviews.length === 0 && !editing ? (
        <div className={cn('leading-[1.55] text-fg-dim', desktop ? 'text-[15px]' : 'text-[15px]')}>
          {place.status === 'visited'
            ? 'Были, а записать впечатления не успели. Ещё не поздно.'
            : 'Ещё не были — отзывов нет. Появятся, когда сходим.'}
        </div>
      ) : null}

      {mine && !editing ? (
        <ReviewCard
          review={mine}
          mine
          desktop={desktop}
          onEdit={() => setEditing(true)}
          onDelete={() => void onDelete(mine.id)}
          deleting={remove.isPending}
        />
      ) : null}

      {editing ? (
        <ReviewForm
          review={mine}
          desktop={desktop}
          saving={save.isPending}
          error={save.error}
          onCancel={() => setEditing(false)}
          onSave={(input) => {
            save.mutate(input, { onSuccess: () => setEditing(false) })
          }}
        />
      ) : null}

      {others.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          mine={false}
          desktop={desktop}
          photos={photos.filter((photo) => photo.reviewId === review.id)}
          onEdit={() => {}}
          onDelete={() => {}}
        />
      ))}

      {!mine && !editing ? (
        <Button
          variant="surface"
          size="md"
          onClick={() => setEditing(true)}
          className={cn('w-full', desktop && 'bg-surface-d hover:bg-surface-2')}
        >
          Оставить отзыв
        </Button>
      ) : null}

      {/* О-6: первый отзыв сам переводит место в «были» — предупреждаем заранее,
          чтобы смена статуса не выглядела самоуправством приложения. */}
      {editing && !mine && place.status !== 'visited' ? (
        <div className="px-1 text-[12.5px] leading-relaxed text-fg-dim">
          После сохранения место перейдёт в «были».
        </div>
      ) : null}
    </div>
  )
}
