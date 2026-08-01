import { Pencil, Trash2 } from 'lucide-react'

import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Review } from '@/types/models'

import { Stars } from './Stars'

interface Props {
  review: Review
  mine: boolean
  desktop?: boolean
  onEdit: () => void
  onDelete: () => void
  deleting?: boolean
}

/** О-3: отзывы обоих показываются рядом, ничей не прячется. */
export function ReviewCard({ review, mine, desktop = false, onEdit, onDelete, deleting = false }: Props) {
  const authorName = review.author?.displayName ?? '—'

  return (
    <div className={cn('animate-pop rounded-[20px]', desktop ? 'bg-surface-d p-5' : 'bg-surface-2 p-4')}>
      <div className="flex items-center gap-3">
        <Avatar name={authorName} url={review.author?.avatarUrl} size={desktop ? 32 : 26} accent={mine} />
        <div className="min-w-0 flex-1">
          <div className={cn('font-semibold text-fg', desktop ? 'text-[15px]' : 'text-[13.5px]')}>{authorName}</div>
          {review.visitedAt ? (
            <div className="mt-0.5 text-[12.5px] text-fg-dim">были {formatDate(review.visitedAt)}</div>
          ) : null}
        </div>
        <Stars value={review.rating} size={desktop ? 16 : 14} />
      </div>

      {review.text ? (
        <p className={cn('mt-3 leading-[1.6] text-fg-body text-pretty', desktop ? 'text-[14.5px]' : 'text-[13.5px]')}>
          {review.text}
        </p>
      ) : null}

      {/* О-4: правит и удаляет только автор. Настоящая защита — RLS (Б-3). */}
      {mine ? (
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill bg-surface-3 px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-fg"
          >
            <Pencil size={12} />
            Изменить
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex cursor-pointer items-center gap-1.5 rounded-pill bg-surface-3 px-3 py-1.5 text-xs font-semibold text-fg-muted transition-colors hover:text-[#FF7A6B] disabled:opacity-50"
          >
            <Trash2 size={12} />
            Удалить
          </button>
        </div>
      ) : null}
    </div>
  )
}
