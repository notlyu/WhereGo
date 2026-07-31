import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/cn'

/** Надзаголовок поля: «НАЗВАНИЕ», «АДРЕС» — стиль из прототипа. */
export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3">
      <div className="eyebrow">{children}</div>
      {hint ? <div className="text-xs text-fg-dimmer">{hint}</div> : null}
    </div>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-[54px] w-full rounded-card bg-surface-2 px-[18px] text-[15px] text-fg outline-none',
        'placeholder:text-fg-dimmer focus:ring-1 focus:ring-border-3',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-28 w-full resize-y rounded-card bg-surface-2 px-[18px] py-4 text-[15px] leading-relaxed text-fg outline-none',
        'placeholder:text-fg-dimmer focus:ring-1 focus:ring-border-3',
        className,
      )}
      {...props}
    />
  )
}

export function FieldError({ children }: { children: ReactNode }) {
  if (!children) return null
  return <div className="mt-2 text-[13px] text-[#FF7A6B]">{children}</div>
}
