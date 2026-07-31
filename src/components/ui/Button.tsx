import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

type Variant = 'accent' | 'surface' | 'ghost' | 'dashed'
type Size = 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANTS: Record<Variant, string> = {
  accent: 'bg-accent text-on-accent font-bold hover:bg-accent-hover',
  surface: 'bg-surface-2 text-fg font-semibold hover:bg-surface-4',
  ghost: 'text-fg-muted font-semibold hover:text-fg',
  dashed: 'border-[1.5px] border-dashed border-border-3 text-fg-muted font-semibold hover:border-accent hover:text-accent',
}

const SIZES: Record<Size, string> = {
  md: 'h-[46px] px-5 text-sm',
  lg: 'h-14 px-6 text-base',
}

export function Button({ variant = 'accent', size = 'lg', className, ...props }: Props) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-45',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
