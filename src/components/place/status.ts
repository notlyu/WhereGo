import type { PlaceStatus } from '@/types/models'

/** М-4: цветовая индикация статуса. Значения — из Design-System.md. */
export const STATUS_DOT: Record<PlaceStatus, string> = {
  want: 'bg-status-want',
  visited: 'bg-fg',
  rejected: 'bg-fg-faint',
}

/** Плашка поверх фото места. Полупрозрачная, с размытием — как в прототипе. */
export const STATUS_BADGE: Record<PlaceStatus, string> = {
  want: 'bg-accent/15 text-accent',
  visited: 'bg-surface-4/85 text-fg',
  rejected: 'bg-surface-1/80 text-fg-dim',
}

export const STATUS_OPTIONS: { value: PlaceStatus; label: string }[] = [
  { value: 'want', label: 'хочу сходить' },
  { value: 'visited', label: 'были' },
  { value: 'rejected', label: 'не зашло' },
]
