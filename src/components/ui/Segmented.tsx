import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/** Сегменты в пилюле — «Места / Идеи», статусы места. Геометрия из прототипа. */
export function Segmented<T extends string>({ options, value, onChange, className }: Props<T>) {
  return (
    <div className={cn('flex gap-1.5 rounded-pill bg-track p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 cursor-pointer rounded-pill py-[11px] text-center text-sm font-semibold transition-colors',
            option.value === value ? 'bg-surface-4 text-fg' : 'text-fg-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
