import { Star } from 'lucide-react'

import { cn } from '@/lib/cn'

/** Оценка только для показа: пять звёзд, закрашены первые `value`. */
export function Stars({ value, size = 15 }: { value: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Оценка ${value} из 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={cn(n <= value ? 'fill-accent text-accent' : 'text-surface-4')}
          aria-hidden
        />
      ))}
    </div>
  )
}

/** Оценка в форме: те же звёзды, но по ним можно нажать. */
export function StarsInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`Поставить ${n} из 5`}
          aria-pressed={n === value}
          className="cursor-pointer p-0.5 transition-transform hover:scale-110"
        >
          <Star size={26} className={cn(n <= value ? 'fill-accent text-accent' : 'text-surface-4 hover:text-fg-dim')} />
        </button>
      ))}
    </div>
  )
}
