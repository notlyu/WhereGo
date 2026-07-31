import { useEffect, type ReactNode } from 'react'

/**
 * Нижняя шторка (Л-5). На десктопе выглядит так же — прототип не разводит их,
 * а отдельный поповер ради ≥900px не окупается.
 */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 cursor-default bg-bg-deep/70" />
      <div className="animate-pop relative mx-auto max-h-[82%] w-full max-w-[560px] overflow-y-auto rounded-t-[28px] bg-surface-1 px-5 pt-3 pb-6">
        <div className="mx-auto mb-3.5 h-1 w-11 rounded-pill bg-border-3" />
        {children}
      </div>
    </div>
  )
}
