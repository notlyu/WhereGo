import type { ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  size?: 'sm' | 'md'
  /**
   * Выбранный чип в мобильном макете — акцентный зелёный, в десктопном — белый.
   * Это не оплошность прототипа: на десктопе чипов в панели много и зелёного
   * в строке было бы слишком.
   */
  tone?: 'accent' | 'contrast'
}

export function Chip({ active = false, size = 'md', tone = 'accent', className, ...props }: Props) {
  const inactive = tone === 'contrast' ? 'bg-border text-fg-muted hover:bg-surface-3 hover:text-fg' : 'bg-surface-3 text-fg-muted hover:bg-surface-4 hover:text-fg'
  const selected = tone === 'contrast' ? 'bg-fg text-bg' : 'bg-accent text-on-accent'

  return (
    <button
      type="button"
      className={cn(
        'cursor-pointer rounded-pill font-semibold whitespace-nowrap transition-colors',
        size === 'md' ? 'px-4 py-2.5 text-[13.5px]' : 'px-3.5 py-[9px] text-[13px]',
        active ? selected : inactive,
        className,
      )}
      {...props}
    />
  )
}
