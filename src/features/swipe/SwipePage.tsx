import { Check, Shuffle, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { PlaceCover } from '@/components/place/PlaceCover'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFeedData } from '@/features/feed/useFeedData'
import { useCastVote, useVotes } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { PRICE_SHORT, type Place } from '@/types/models'

import { pickRandom, selectMatches, selectSwipeQueue, swipeProgress } from './select-swipes'

/** В-1, В-5: свайпы со штампами и прогрессом плюс рандомайзер. */
export function SwipePage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { list, meId } = useFeedData()
  const { data: votes = [], isPending } = useVotes()
  const cast = useCastVote()

  /** Отлетающая карточка: направление держим до конца анимации. */
  const [flying, setFlying] = useState<'yes' | 'no' | null>(null)
  /**
   * За какое место уже проголосовали, но очередь ещё не обновилась.
   *
   * Одной анимации мало: между отправкой голоса и приходом новой очереди
   * проходит время, и быстрый второй тап переголосовал бы ту же карточку —
   * то есть один голос молча терялся.
   */
  const [pendingId, setPendingId] = useState<string | null>(null)

  const queue = useMemo(() => selectSwipeQueue(list, votes, meId), [list, votes, meId])
  const matches = useMemo(() => selectMatches(list, votes), [list, votes])
  const progress = useMemo(() => swipeProgress(list, votes, meId), [list, votes, meId])

  const current = queue[0] ?? null
  // Очередь обновилась — блокировку можно снимать.
  if (pendingId && current?.id !== pendingId) {
    setPendingId(null)
  }

  const locked = flying !== null || pendingId !== null

  function vote(wants: boolean) {
    if (!current || locked) return
    setFlying(wants ? 'yes' : 'no')
    setPendingId(current.id)
    // Даём карточке улететь, потом отправляем голос.
    setTimeout(() => {
      cast.mutate({ placeId: current.id, wants })
      setFlying(null)
    }, 260)
  }

  function surprise() {
    const chosen = pickRandom(matches, list)
    if (chosen) void navigate(`/place/${chosen.id}`)
  }

  return (
    <div className={cn('relative', isDesktop ? '' : 'px-5 pt-4 pb-28')}>
      {isDesktop ? null : (
        <div className="glow-accent pointer-events-none absolute -top-58 -right-20 -left-20 h-[400px]" />
      )}

      <header className="relative">
        {isDesktop ? (
          <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">выбор</div>
        ) : null}
        <h1
          className={cn(
            'font-display font-medium tracking-[-.02em] text-fg',
            isDesktop ? 'mt-2 text-[44px] leading-none' : 'text-4xl leading-none',
          )}
        >
          Выбери за нас
        </h1>
        <p className={cn('text-sm leading-[1.5] text-fg-muted', isDesktop ? 'mt-3 max-w-[560px]' : 'mt-2')}>
          Свайпаете вы оба. Место, за которое сказали «хочу» и тот и другой, падает в «Оба хотим».
        </p>

        <div className={cn('flex flex-wrap items-center gap-2.5', isDesktop ? 'mt-5' : 'mt-3.5')}>
          <Link
            to="/matches"
            className={cn(
              'flex flex-1 items-center gap-3 rounded-pill py-2.5 pr-3 pl-[18px] transition-colors',
              isDesktop ? 'max-w-[380px] bg-surface-d hover:bg-surface-2' : 'bg-surface-2 hover:bg-surface-4',
            )}
          >
            <span className="flex-1 text-sm font-semibold text-fg">Оба хотим · {matches.length}</span>
            <span className="rounded-pill bg-accent/15 px-3 py-[7px] text-[12.5px] font-semibold text-accent">
              открыть список
            </span>
          </Link>

          <Button variant="surface" size="md" onClick={surprise} className={isDesktop ? 'bg-surface-d' : undefined}>
            <Shuffle size={15} />
            Выбери за нас
          </Button>
        </div>

        <div className="mt-3 text-xs text-fg-dim">
          {progress.total > 0 ? `Отсмотрено ${progress.done} из ${progress.total}` : 'Мест пока нет'}
        </div>
      </header>

      {isPending ? (
        <div className={cn('animate-pulse rounded-3xl bg-surface-2', isDesktop ? 'mt-6 h-[460px] max-w-[420px]' : 'mt-5 h-[420px]')} />
      ) : current ? (
        <>
          <div className={cn('relative', isDesktop ? 'mt-6 h-[460px] max-w-[420px]' : 'mt-5 min-h-[380px]')}>
            {/* Две подложки — видно, что за верхней карточкой есть ещё. */}
            <div className="absolute inset-x-[18px] top-[18px] bottom-1 rounded-3xl bg-surface-d" />
            <div className="absolute inset-x-[9px] top-[9px] bottom-3 rounded-3xl bg-track" />

            <SwipeCard place={current} flying={flying} onOpen={() => void navigate(`/place/${current.id}`)} />
          </div>

          <div className={cn('flex justify-center gap-4', isDesktop ? 'mt-6 max-w-[420px]' : 'mt-6')}>
            <button
              type="button"
              onClick={() => vote(false)}
              disabled={locked}
              aria-label="Не хочу"
              className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-fg-muted transition-colors hover:bg-surface-4 disabled:opacity-50"
            >
              <X size={24} />
            </button>
            <button
              type="button"
              onClick={() => vote(true)}
              disabled={locked}
              aria-label="Хочу"
              className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-pill bg-accent text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              <Check size={24} />
            </button>
          </div>
        </>
      ) : (
        <div className={cn(isDesktop ? 'mt-6 max-w-[560px]' : 'mt-6')}>
          <EmptyState
            title={progress.total === 0 ? 'Свайпать пока нечего' : 'Всё пересмотрено'}
            hint={
              progress.total === 0
                ? 'Добавьте несколько мест — и возвращайтесь.'
                : matches.length > 0
                  ? `Совпадений набралось ${matches.length}. Осталось выбрать вечер.`
                  : 'Совпадений пока нет. Ждём, пока второй тоже пройдёт список.'
            }
            action={
              matches.length > 0 ? (
                <Link to="/matches" className="text-sm font-semibold text-accent">
                  Открыть «Оба хотим»
                </Link>
              ) : (
                <Link to="/" className="text-sm font-semibold text-accent">
                  Вернуться в ленту
                </Link>
              )
            }
          />
        </div>
      )}
    </div>
  )
}

function SwipeCard({ place, flying, onOpen }: { place: Place; flying: 'yes' | 'no' | null; onOpen: () => void }) {
  const meta = [place.category?.name, place.price ? PRICE_SHORT[place.price] : null].filter(Boolean).join(' · ')

  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col overflow-hidden rounded-3xl bg-surface-2 transition-all duration-[260ms] ease-out',
        flying === 'yes' && 'translate-x-[120%] rotate-12 opacity-0',
        flying === 'no' && '-translate-x-[120%] -rotate-12 opacity-0',
      )}
    >
      <div className="relative flex-1">
        <PlaceCover place={place} height={9999} className="h-full" showStatus={false} label="фото пока нет" />

        {/* Штампы: появляются в момент решения, как в макете. */}
        <Stamp side="yes" visible={flying === 'yes'}>
          хочу
        </Stamp>
        <Stamp side="no" visible={flying === 'no'}>
          не хочу
        </Stamp>
      </div>

      <div className="px-5 pt-4 pb-[18px]">
        <div className="font-display text-[25px] leading-[1.1] font-medium tracking-[-.01em] text-fg">{place.title}</div>
        <div className="mt-1.5 text-[13.5px] text-fg-muted">{meta || 'без категории'}</div>
        {place.description ? (
          <div className="mt-2.5 line-clamp-2 text-[13.5px] leading-[1.5] text-fg-body">{place.description}</div>
        ) : null}

        <div className="mt-3 flex items-center gap-2.5">
          <div className="flex-1 text-[12.5px] text-fg-dim">
            добавлено: {place.author?.displayName ?? '—'}
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="h-9 cursor-pointer rounded-pill bg-surface-4 px-3.5 text-[12.5px] font-semibold text-fg transition-colors hover:bg-border-3"
          >
            Подробнее
          </button>
        </div>
      </div>
    </div>
  )
}

function Stamp({ side, visible, children }: { side: 'yes' | 'no'; visible: boolean; children: string }) {
  return (
    <div
      className={cn(
        'absolute top-8 rounded-card border-[3px] px-4 py-2 text-lg font-bold tracking-[.08em] uppercase transition-opacity',
        side === 'yes' ? 'left-6 -rotate-12 border-accent text-accent' : 'right-6 rotate-12 border-[#FF7A6B] text-[#FF7A6B]',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {children}
    </div>
  )
}
