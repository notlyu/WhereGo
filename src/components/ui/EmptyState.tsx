import type { ReactNode } from 'react'

/**
 * Пустое состояние. Тон — от первого лица множественного числа (С-4):
 * «Ещё не были — отзывов нет», а не «Нет данных».
 */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-card bg-surface-2 px-6 py-10 text-center">
      <div className="text-[15px] font-semibold text-fg">{title}</div>
      {hint ? <div className="mx-auto mt-2 max-w-[320px] text-sm leading-relaxed text-fg-dim">{hint}</div> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}
