import { Link } from 'react-router'

/**
 * Экраны следующих этапов. Маршруты заведены сразу, чтобы навигация была
 * целой, а не вела в 404: пустой экран с честной подписью лучше сломанной ссылки.
 */
export function StubPage({ title, stage, what }: { title: string; stage: number; what: string }) {
  return (
    <div className="px-5 pt-3.5 desktop:px-0">
      <div className="eyebrow">этап {stage}</div>
      <h1 className="mt-1.5 font-display text-[38px] leading-none font-medium tracking-[-.02em] text-fg">{title}</h1>

      <div className="mt-6 rounded-card bg-surface-2 px-5 py-6">
        <div className="text-[15px] leading-relaxed text-fg-body">{what}</div>
        <div className="mt-4 text-sm leading-relaxed text-fg-dim">
          Экран из этапа {stage}. Сейчас готов этап 1 — лента, места, категории и статусы.
        </div>
        <Link to="/" className="mt-5 inline-block text-sm font-semibold text-accent">
          ← в ленту
        </Link>
      </div>
    </div>
  )
}
