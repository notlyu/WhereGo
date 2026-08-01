import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import { PlaceCompactRow } from '@/components/place/PlaceCompactRow'
import { EmptyState } from '@/components/ui/EmptyState'
import { useFeedData } from '@/features/feed/useFeedData'
import { useVotes } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'

import { selectMatches } from './select-swipes'

/** В-2: места, которые в свайпах отметили оба. */
export function MatchesPage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { list, meId, here } = useFeedData()
  const { data: votes = [], isPending } = useVotes()

  const matches = useMemo(() => selectMatches(list, votes), [list, votes])

  return (
    <div className={cn(isDesktop ? '' : 'px-5 pt-3.5 pb-8')}>
      {isDesktop ? (
        <header>
          <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">совпадения · {matches.length}</div>
          <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Оба хотим</h1>
          <p className="mt-3 max-w-[560px] text-sm leading-relaxed text-fg-muted">
            Места, которые в свайпах отметили и вы, и Алина.
          </p>
        </header>
      ) : (
        <>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={() => void navigate('/swipe')}
              aria-label="Назад к свайпам"
              className="flex h-[42px] w-[42px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="font-display text-[30px] font-medium tracking-[-.02em] text-fg">Оба хотим</h1>
          </div>
          <p className="mt-3.5 mb-[18px] ml-14 text-sm leading-[1.5] text-fg-muted">
            Места, которые в свайпах отметили оба.
          </p>
        </>
      )}

      {isPending ? (
        <div className={cn('flex flex-col gap-2', isDesktop && 'mt-6 max-w-[720px]')}>
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-20 animate-pulse rounded-card bg-surface-2" />
          ))}
        </div>
      ) : matches.length > 0 ? (
        <div className={cn('flex flex-col gap-2', isDesktop && 'mt-6 max-w-[720px]')}>
          {matches.map((place) => (
            <div key={place.id} className="relative">
              <PlaceCompactRow place={place} meId={meId} here={here} />
              <div className="pointer-events-none absolute top-1/2 right-12 -translate-y-1/2 rounded-pill bg-accent/15 px-2.5 py-1.5 text-xs font-semibold text-accent">
                оба
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={cn(isDesktop && 'mt-6 max-w-[560px]')}>
          <EmptyState
            title="Пока пусто"
            hint="Свайпайте — совпадения появятся здесь, когда место отметят оба."
            action={
              <Link to="/swipe" className="text-sm font-semibold text-accent">
                К свайпам
              </Link>
            }
          />
        </div>
      )}
    </div>
  )
}
