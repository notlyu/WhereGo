import { Check, Pencil, X } from 'lucide-react'
import { useState } from 'react'

import { Chip } from '@/components/ui/Chip'
import { useCategories, useCreateCategory, useDeleteCategory, useRenameCategory } from '@/hooks/queries'
import { cn } from '@/lib/cn'

/**
 * М-6: категории — редактируемый справочник, а не enum. Создание, переименование
 * и удаление живут прямо в форме места: отдельный экран настроек ради девяти
 * строк справочника — лишний.
 */
export function CategoryPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { data: categories = [] } = useCategories()
  const create = useCreateCategory()
  const rename = useRenameCategory()
  const remove = useDeleteCategory()

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  /** null — поле закрыто, '' — создаём новую, id — переименовываем. */
  const [target, setTarget] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const name = draft.trim()
    if (!name) return
    setError(null)
    try {
      if (target === '') {
        const created = await create.mutateAsync(name)
        onChange(created.id)
      } else if (target) {
        await rename.mutateAsync({ id: target, name })
      }
      setTarget(null)
      setDraft('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не получилось сохранить категорию')
    }
  }

  async function onRemove(id: string, name: string) {
    if (!confirm(`Удалить категорию «${name}»? Места останутся, но без категории.`)) return
    if (value === id) onChange(null)
    await remove.mutateAsync(id)
  }

  return (
    <>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="eyebrow">категория</div>
        <button
          type="button"
          onClick={() => {
            setEditing((prev) => !prev)
            setTarget(null)
          }}
          className="cursor-pointer text-[13px] font-semibold text-accent"
        >
          {editing ? 'готово' : 'править список'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <div
            key={category.id}
            className={cn(
              'flex items-center gap-1.5 rounded-pill',
              editing && 'bg-surface-3 pr-2',
              !editing && 'contents',
            )}
          >
            <Chip
              active={value === category.id}
              onClick={() => onChange(value === category.id ? null : category.id)}
              className={editing ? 'bg-transparent hover:bg-transparent' : undefined}
            >
              {category.emoji ? `${category.emoji} ` : ''}
              {category.name}
            </Chip>

            {editing ? (
              <>
                <button
                  type="button"
                  aria-label={`Переименовать ${category.name}`}
                  onClick={() => {
                    setTarget(category.id)
                    setDraft(category.name)
                  }}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-pill bg-white/8 text-fg-muted hover:text-fg"
                >
                  <Pencil size={11} />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить ${category.name}`}
                  onClick={() => void onRemove(category.id, category.name)}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-pill bg-white/8 text-fg-muted hover:text-[#FF7A6B]"
                >
                  <X size={11} />
                </button>
              </>
            ) : null}
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setTarget('')
            setDraft('')
          }}
          className="cursor-pointer rounded-pill border-[1.5px] border-dashed border-border-3 px-4 py-2.5 text-[13.5px] font-semibold text-fg-muted transition-colors hover:border-accent hover:text-accent"
        >
          + категория
        </button>
      </div>

      {target !== null ? (
        <div className="mt-2.5 flex gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void submit()
              }
              if (event.key === 'Escape') setTarget(null)
            }}
            placeholder={target === '' ? 'Название новой категории' : 'Новое название'}
            className="h-[46px] flex-1 rounded-pill bg-surface-1 px-[18px] text-sm text-fg outline-none placeholder:text-fg-dimmer"
          />
          <button
            type="button"
            onClick={() => void submit()}
            className="flex h-[46px] cursor-pointer items-center gap-1.5 rounded-pill bg-accent px-5 text-[13.5px] font-bold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <Check size={15} />
            Готово
          </button>
        </div>
      ) : null}

      {error ? <div className="mt-2 text-[13px] text-[#FF7A6B]">{error}</div> : null}
    </>
  )
}
