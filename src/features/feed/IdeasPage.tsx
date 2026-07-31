import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { useCreatePlace, useDeletePlace, useUpdatePlace } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatAgo } from '@/lib/format'
import type { Place, Profile } from '@/types/models'

import { useFeedData } from './useFeedData'

/**
 * М-7: идея — место без адреса. Отдельного хранилища у неё нет, это флаг
 * `is_idea`, поэтому «в ленту» = снятие флага, а не перенос между таблицами.
 *
 * В макете телефона идеи — сегмент внутри ленты, на десктопе — свой пункт
 * бокового меню. Маршрут один: `/ideas`, шапка разная.
 */
export function IdeasPage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { ideas, me } = useFeedData()

  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const create = useCreatePlace()

  async function save() {
    const title = draft.trim()
    if (!title) return
    await create.mutateAsync({
      title,
      categoryId: null,
      description: null,
      address: null,
      lat: null,
      lng: null,
      sourceUrl: null,
      sourceTitle: null,
      price: null,
      isIdea: true,
    })
    setDraft('')
    setAdding(false)
  }

  const editor = adding ? (
    <div
      className={cn(
        'animate-pop rounded-[22px]',
        isDesktop ? 'mt-[22px] max-w-[640px] bg-surface-d p-[22px]' : 'rounded-[18px] bg-surface-2 p-[18px]',
      )}
    >
      <input
        autoFocus
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void save()
          if (event.key === 'Escape') setAdding(false)
        }}
        placeholder="Что хочется сделать?"
        className={cn(
          'w-full rounded-field px-4 text-[15px] text-fg outline-none placeholder:text-fg-dimmer',
          isDesktop ? 'h-[50px] bg-well px-[18px]' : 'h-12 bg-surface-1',
        )}
      />
      <div className={cn('flex gap-2.5', isDesktop ? 'mt-4' : 'mt-3.5')}>
        <Button size="md" onClick={() => void save()} disabled={!draft.trim() || create.isPending} className={isDesktop ? 'px-6' : 'flex-1'}>
          Сохранить
        </Button>
        <Button size="md" variant="surface" onClick={() => setAdding(false)} className="bg-surface-3 text-fg-muted">
          Отмена
        </Button>
      </div>
    </div>
  ) : null

  if (isDesktop) {
    return (
      <div>
        <header className="flex items-end justify-between gap-6">
          <div>
            <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">без адреса</div>
            <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Идеи</h1>
          </div>
          <Button size="md" onClick={() => setAdding(true)} className="px-[22px]">
            <Plus size={17} />
            Добавить идею
          </Button>
        </header>

        {editor}

        <div className="mt-[22px] grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
          {ideas.map((idea) => (
            <IdeaRow key={idea.id} idea={idea} me={me} desktop />
          ))}
        </div>

        {ideas.length === 0 && !adding ? (
          <div className="mt-[22px] text-[15px] text-fg-dim">Идей пока нет. Первая появится, когда что-нибудь захочется.</div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="relative px-5">
      <div className="glow-accent pointer-events-none absolute -top-52 -right-20 -left-20 h-[400px]" />

      <header className="relative flex items-end justify-between gap-6 pt-3.5 pb-[18px]">
        <div>
          <div className="eyebrow">Санкт-Петербург</div>
          <h1 className="mt-1.5 font-display text-[38px] leading-none font-medium tracking-[-.02em] text-fg">Наши места</h1>
        </div>
        <Link
          to="/place/new"
          aria-label="Добавить место"
          className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <Plus size={22} />
        </Link>
      </header>

      <Segmented
        className="mb-4"
        value="ideas"
        onChange={(next) => {
          if (next === 'places') void navigate('/')
        }}
        options={[
          { value: 'places', label: 'Места' },
          { value: 'ideas', label: 'Идеи' },
        ]}
      />

      <div className="flex flex-col gap-2.5">
        <div className="pb-1 text-sm leading-relaxed text-fg-muted">Без адреса — просто то, что хочется однажды сделать.</div>

        {editor ?? (
          <Button variant="dashed" size="md" onClick={() => setAdding(true)} className="h-[52px] w-full text-[14.5px]">
            <Plus size={17} />
            Добавить идею
          </Button>
        )}

        {ideas.map((idea) => (
          <IdeaRow key={idea.id} idea={idea} me={me} />
        ))}

        {ideas.length === 0 && !adding ? (
          <div className="px-1 py-6 text-center text-sm text-fg-dim">
            Идей пока нет. Первая появится, когда что-нибудь захочется.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function IdeaRow({ idea, me, desktop = false }: { idea: Place; me: Profile | null; desktop?: boolean }) {
  const navigate = useNavigate()
  const update = useUpdatePlace(idea.id)
  const remove = useDeletePlace()
  const mine = idea.authorId === me?.id

  async function toFeed() {
    await update.mutateAsync({
      title: idea.title,
      categoryId: idea.categoryId,
      description: idea.description,
      address: idea.address,
      lat: idea.lat,
      lng: idea.lng,
      sourceUrl: idea.sourceUrl,
      sourceTitle: idea.sourceTitle,
      price: idea.price,
      isIdea: false,
    })
    // Адреса и категории у идеи нет — сразу открываем правку, чтобы дозаполнить.
    void navigate(`/place/${idea.id}/edit`)
  }

  return (
    <div
      className={cn(
        'animate-pop flex items-center gap-3',
        desktop ? 'rounded-[20px] bg-surface-d px-5 py-[18px]' : 'rounded-[18px] bg-surface-2 px-[18px] py-4',
      )}
    >
      <div className="h-2.5 w-2.5 flex-none rounded-full bg-accent" />
      <div className="min-w-0 flex-1">
        <div className="line-clamp-2 text-base font-semibold text-fg">{idea.title}</div>
        <div className="mt-1 truncate text-[13px] text-fg-dim">
          добавил{mine ? 'а' : ''}: {idea.author?.displayName ?? '—'} · {formatAgo(idea.createdAt)}
        </div>
      </div>

      {mine ? (
        <>
          <button
            type="button"
            onClick={() => void toFeed()}
            disabled={update.isPending}
            className="h-9 flex-none cursor-pointer rounded-pill bg-accent/15 px-3.5 text-[12.5px] font-semibold text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            в ленту
          </button>
          <button
            type="button"
            onClick={() => remove.mutate(idea.id)}
            aria-label="Удалить идею"
            className={cn(
              'flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-pill text-fg-muted transition-colors hover:text-[#FF7A6B]',
              desktop ? 'bg-surface-3' : 'bg-surface-4',
            )}
          >
            <X size={13} />
          </button>
        </>
      ) : null}
    </div>
  )
}
