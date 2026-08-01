import { ArrowLeft, ArrowUpRight, Compass, Pencil, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { PlaceCover } from '@/components/place/PlaceCover'
import { STATUS_OPTIONS } from '@/components/place/status'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Segmented } from '@/components/ui/Segmented'
import { useAuth } from '@/hooks/auth-context'
import { useDeletePlace, usePlace, useSetPlaceStatus } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import { PRICE_LABEL, type Place, type PlaceStatus, type Profile } from '@/types/models'

export function PlacePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { profile } = useAuth()
  const { data: place, isPending, isError, error } = usePlace(id)
  const setStatus = useSetPlaceStatus()
  const remove = useDeletePlace()

  if (isPending) {
    return <div className={cn('animate-pulse bg-surface-2', isDesktop ? 'h-[70vh] rounded-card' : 'h-[70vh]')} />
  }

  if (isError || !place) {
    return (
      <div className="px-5 pt-8 desktop:px-0">
        <EmptyState
          title="Такого места у нас нет"
          hint={isError && error instanceof Error ? error.message : 'Возможно, его удалили.'}
          action={
            <Link to="/" className="text-sm font-semibold text-accent">
              Вернуться в ленту
            </Link>
          }
        />
      </div>
    )
  }

  const mine = place.authorId === profile?.id

  async function onDelete() {
    if (!place) return
    if (!confirm(`Удалить «${place.title}»? Отменить будет нельзя.`)) return
    await remove.mutateAsync(place.id)
    void navigate('/', { replace: true })
  }

  const info = (
    <PlaceInfo
      place={place}
      mine={mine}
      me={profile}
      desktop={isDesktop}
      onStatus={(status) => setStatus.mutate({ id: place.id, status })}
      onEdit={() => void navigate(`/place/${place.id}/edit`)}
      onDelete={() => void onDelete()}
      deleting={remove.isPending}
      onPlans={() => void navigate('/plans')}
      onMap={() => void navigate('/map')}
    />
  )

  // ── Десктоп: две колонки, правая липкая ──────────────────────────────────
  if (isDesktop) {
    return (
      <article>
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-pill bg-surface-d pr-[18px] pl-3.5 text-[13.5px] font-semibold text-fg transition-colors hover:bg-surface-2"
        >
          <ArrowLeft size={15} />
          Назад
        </button>

        <div className="mt-[22px] grid items-start gap-7 grid-cols-[repeat(auto-fit,minmax(380px,1fr))]">
          <div>
            <PlaceCover place={place} height={420} className="rounded-3xl" label="фото появятся на этапе 2" showStatus={false} />
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="hatch-sm h-[110px] rounded-card" />
              ))}
            </div>

            <div className="mt-[34px] text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">отзывы</div>
            <div className="mt-3.5 text-[15px] leading-relaxed text-fg-dim">{reviewsPlaceholder(place)}</div>
          </div>

          <div className="sticky top-[34px]">{info}</div>
        </div>
      </article>
    )
  }

  // ── Телефон: одна колонка, обложка во всю ширину ─────────────────────────
  return (
    <article className="pb-11">
      <div className="relative">
        <PlaceCover place={place} height={300} label="фото появятся на этапе 2" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-b from-transparent to-bg" />
        <button
          type="button"
          onClick={() => void navigate(-1)}
          aria-label="Назад"
          className="absolute top-3 left-4 flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-pill bg-bg/60 text-fg backdrop-blur-md"
        >
          <ArrowLeft size={19} />
        </button>
      </div>

      <div className="px-5 pt-1.5">
        {info}

        <div className="my-6 h-px bg-[#262626]" />
        <div className="eyebrow">что мы подумали</div>
        <div className="mt-3 text-[15px] leading-[1.55] text-fg-dim">{reviewsPlaceholder(place)}</div>
      </div>
    </article>
  )
}

/** О-1…О-7 — Этап 2. Формулировка пустого состояния из ТЗ (С-4). */
function reviewsPlaceholder(place: Place): string {
  return place.status === 'visited'
    ? 'Были, но отзывов ещё нет. Отзывы появятся на следующем этапе.'
    : 'Ещё не были — отзывов нет. Появятся, когда сходим.'
}

interface InfoProps {
  place: Place
  mine: boolean
  me: Profile | null
  desktop: boolean
  onStatus: (status: PlaceStatus) => void
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
  onPlans: () => void
  onMap: () => void
}

/** Смысловой блок места. Один на оба макета — различаются только размеры. */
function PlaceInfo({ place, mine, desktop, onStatus, onEdit, onDelete, deleting, onPlans, onMap }: InfoProps) {
  const authorName = place.author?.displayName ?? '—'

  return (
    <>
      <div className={cn('font-semibold tracking-[.1em] uppercase', desktop ? 'text-[11.5px] text-fg-muted' : 'eyebrow')}>
        {place.category?.name ?? 'без категории'}
      </div>

      <h1
        className={cn(
          'font-display font-medium text-fg',
          desktop ? 'mt-2.5 text-[46px] leading-[1.05] tracking-[-.025em]' : 'mt-2 text-[38px] leading-[1.05] tracking-[-.02em]',
        )}
      >
        {place.title}
      </h1>

      {place.address ? (
        <div className={cn('text-fg-muted', desktop ? 'mt-3 text-[14.5px]' : 'mt-2.5 text-sm')}>{place.address}</div>
      ) : null}

      {place.status === 'want' ? (
        <div className={cn('text-[11px] font-semibold tracking-[.1em] text-fg-muted uppercase', desktop ? 'mt-3.5' : 'mt-3.5')}>
          {mine ? 'хочу я' : `хочет ${authorName}`}
        </div>
      ) : null}

      {/* М-5: статус меняет любой авторизованный, не только автор. */}
      <Segmented
        className={cn(desktop ? 'mt-5 bg-surface-1 p-[5px]' : 'mt-5')}
        value={place.status}
        onChange={onStatus}
        options={STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
      />

      {place.description ? (
        <p className={cn('text-base leading-[1.65] text-fg-body text-pretty', desktop ? 'mt-[22px]' : 'mt-5')}>
          {place.description}
        </p>
      ) : null}

      {place.sourceUrl ? (
        <a
          href={place.sourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={cn(
            'mt-5 flex items-center gap-3 rounded-card p-3 transition-colors',
            desktop ? 'bg-surface-d hover:bg-surface-2' : 'bg-surface-2 hover:bg-surface-4',
          )}
        >
          <div
            className={cn(
              'flex flex-none items-center justify-center rounded-pill text-xs font-bold text-fg',
              desktop ? 'h-[38px] w-[38px] bg-surface-3' : 'h-9 w-9 bg-surface-4',
            )}
          >
            ↗
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-fg">{place.sourceTitle ?? place.sourceUrl}</div>
            <div className="mt-0.5 text-[12.5px] text-fg-dim">откуда узнали</div>
          </div>
          <ArrowUpRight size={18} className="flex-none text-accent" />
        </a>
      ) : null}

      <div className={cn('flex items-center gap-3 text-[13px] text-fg-dim', desktop ? 'mt-4' : 'mt-5')}>
        {desktop ? null : <Avatar name={authorName} url={place.author?.avatarUrl} size={28} />}
        <div>
          добавлено: {authorName} · {formatDate(place.createdAt)}
          {place.price ? ` · ${PRICE_LABEL[place.price]}` : ''}
        </div>
      </div>

      <Row className={desktop ? 'mt-[22px]' : 'mt-6'}>
        <Button className="flex-1" onClick={onPlans} size={desktop ? 'md' : 'lg'}>
          Назначить дату
        </Button>
        <Button
          variant="surface"
          aria-label="Показать на карте"
          onClick={onMap}
          size={desktop ? 'md' : 'lg'}
          className={cn('flex-none px-0', desktop ? 'w-[52px] bg-surface-d hover:bg-surface-2' : 'w-[54px]')}
        >
          <Compass size={18} />
        </Button>
      </Row>

      {/* М-3: правит и удаляет только автор. Кнопки скрыты для удобства,
          но настоящая защита — RLS (Б-3). */}
      {mine ? (
        <Row className="mt-2.5">
          <Button
            variant="surface"
            size="md"
            onClick={onEdit}
            className={cn('flex-1', desktop && 'bg-surface-d hover:bg-surface-2')}
          >
            <Pencil size={15} />
            Править
          </Button>
          <Button
            variant="surface"
            size="md"
            onClick={onDelete}
            disabled={deleting}
            className={cn('text-fg-muted hover:text-[#FF7A6B]', desktop && 'bg-surface-d hover:bg-surface-2')}
          >
            <Trash2 size={15} />
            Удалить
          </Button>
        </Row>
      ) : null}
    </>
  )
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex gap-2.5', className)}>{children}</div>
}
