import { Plus, X } from 'lucide-react'
import { useState } from 'react'

import { Chip } from '@/components/ui/Chip'
import { Label } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  /** Метки, которые уже где-то встречались, — предлагаем в один клик. */
  known: string[]
  desktop?: boolean
}

/**
 * М-11: произвольные метки.
 *
 * Справочника с отдельным экраном тут нет намеренно: метка появляется от того,
 * что её кто-то написал, и исчезает, когда перестаёт использоваться. Для двоих
 * это дешевле, чем поддерживать список руками.
 */
export function TagsField({ value, onChange, known, desktop = false }: Props) {
  const [draft, setDraft] = useState('')

  function add(name: string) {
    const clean = name.trim().replace(/^#/, '')
    if (!clean) return
    // Сравнение без учёта регистра: «Закат» и «закат» — одна метка.
    if (value.some((tag) => tag.toLowerCase() === clean.toLowerCase())) return
    onChange([...value, clean])
    setDraft('')
  }

  const suggestions = known.filter((name) => !value.some((tag) => tag.toLowerCase() === name.toLowerCase()))

  return (
    <div>
      <Label hint="необязательно">метки</Label>

      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1.5 rounded-pill bg-accent px-3.5 py-2 text-[13.5px] font-semibold text-on-accent"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== tag))}
              aria-label={`Убрать метку ${tag}`}
              className="cursor-pointer opacity-70 transition-opacity hover:opacity-100"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      <div className={cn('flex gap-2', value.length > 0 && 'mt-2.5')}>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Enter внутри формы места отправил бы её целиком — перехватываем.
            if (event.key === 'Enter') {
              event.preventDefault()
              add(draft)
            }
          }}
          placeholder="закат, свидание, дёшево…"
          className={cn(
            'h-[46px] flex-1 rounded-pill px-[18px] text-sm text-fg outline-none placeholder:text-fg-dimmer',
            desktop ? 'bg-well' : 'bg-surface-1',
          )}
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          aria-label="Добавить метку"
          className="flex h-[46px] w-[46px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-3 text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          <Plus size={17} />
        </button>
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-2">
          {suggestions.slice(0, 12).map((name) => (
            <Chip key={name} size="sm" onClick={() => add(name)}>
              {name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  )
}
