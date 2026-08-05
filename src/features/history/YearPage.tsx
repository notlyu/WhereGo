import { ArrowLeft } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router'

import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { useAllReviews, usePlaces } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatRating } from '@/lib/format'

import { selectVisits, selectYear, yearsWithVisits, type YearStats } from './select-history'

/** И-2: статистика за год и полосы по категориям. */
export function YearPage() {
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()
  const { data: places = [] } = usePlaces()
  const { data: reviews = [] } = useAllReviews()

  const visits = useMemo(() => selectVisits(places, reviews), [places, reviews])
  const years = useMemo(() => yearsWithVisits(visits), [visits])
  const [year, setYear] = useState<number | null>(null)

  const current = year ?? years[0] ?? new Date().getFullYear()
  const stats = useMemo(() => selectYear(visits, current), [visits, current])

  const running = current === new Date().getFullYear()
  const period = `${current}${running ? ', пока что' : ''}`

  const chips =
    years.length > 1 ? (
      <div className={cn('flex flex-wrap gap-2', isDesktop ? 'mt-4' : 'mt-4')}>
        {years.map((value) => (
          <Chip
            key={value}
            size="sm"
            tone={isDesktop ? 'contrast' : 'accent'}
            active={value === current}
            onClick={() => setYear(value)}
          >
            {value}
          </Chip>
        ))}
      </div>
    ) : null

  const empty = (
    <div className="mt-6">
      <EmptyState
        title="За этот год пока пусто"
        hint="Итоги собираются сами: как только сходим куда-нибудь и отметим место как «были», здесь появятся цифры."
        action={
          <Link to="/history" className="text-sm font-semibold text-accent">
            Открыть «Мы были тут»
          </Link>
        }
      />
    </div>
  )

  // ── Десктоп: цифры в строку под чертой, как в десктопном макете ──────────
  if (isDesktop) {
    return (
      <div>
        <header>
          <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">итоги</div>
          <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Итоги года</h1>
        </header>

        {chips}

        {stats.visits === 0 ? (
          empty
        ) : (
          <>
            <div className="mt-6 flex items-baseline gap-4 border-b border-border pb-[22px]">
              <div className="font-display text-[56px] leading-none font-medium tracking-[-.03em] text-accent">
                {stats.visits}
              </div>
              <div className="text-base text-fg-body">{plural(stats.visits)} вдвоём</div>
              <div className="ml-auto text-[12.5px] text-fg-dimmer">{period}</div>
            </div>

            <div className="mt-[22px] grid gap-y-5 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              {statItems(stats).map((item) => (
                <div key={item.label} className="pr-6">
                  <div className="text-[11px] font-semibold tracking-[.1em] text-fg-dimmer uppercase">{item.label}</div>
                  <div className="mt-2 truncate font-display text-[26px] leading-[1.1] font-medium text-fg">{item.value}</div>
                  <div className="mt-1.5 text-[12.5px] text-fg-dim">{item.note}</div>
                </div>
              ))}
            </div>

            <div className="mt-[34px] max-w-[560px]">
              <div className="text-[11px] font-semibold tracking-[.1em] text-fg-dimmer uppercase">куда ходим чаще</div>
              <div className="mt-3.5 flex flex-col gap-3">
                {stats.byCategory.map((bar) => (
                  <div key={bar.label} className="flex items-center gap-3.5">
                    <div className="w-[88px] flex-none truncate text-[13px] text-fg-muted">{bar.label}</div>
                    <Track share={bar.share} className="h-1.5 flex-1" />
                    <div className="w-5 flex-none text-right text-[12.5px] text-fg-dimmer">{bar.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  // ── Телефон: зелёная карточка-итог, плитки 2×2 и полосы в своей карточке ──
  return (
    <div className="px-5 pt-3.5">
      <div className="flex items-center gap-3.5 pb-5">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          aria-label="Назад"
          className="flex h-[42px] w-[42px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-[30px] font-medium tracking-[-.02em] text-fg">Итоги года</h1>
      </div>

      {chips}

      {stats.visits === 0 ? (
        empty
      ) : (
        <>
          {/* Главная цифра года — на тёмно-зелёном, единственное цветное пятно
              в приложении. Она тут одна такая, и в макете подана как обложка,
              а не как ещё одна строка статистики. */}
          <div className={cn('relative overflow-hidden rounded-3xl p-[22px]', years.length > 1 && 'mt-4')} style={{ background: HERO_BG }}>
            <div className="pointer-events-none absolute -top-[90px] -right-10 -left-10 h-[240px]" style={{ background: HERO_GLOW }} />
            <div className="relative">
              <div className="text-xs font-semibold tracking-[.1em] text-white/60 uppercase">{period}</div>
              <div className="mt-2 font-display text-[64px] leading-none font-medium tracking-[-.03em] text-white">
                {stats.visits}
              </div>
              <div className="mt-1 text-base text-white/75">{plural(stats.visits)} вдвоём</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {statItems(stats).map((item) => (
              <div key={item.label} className="rounded-[20px] bg-surface-2 p-[18px]">
                <div className="text-[11px] font-semibold tracking-[.1em] text-fg-dimmer uppercase">{item.label}</div>
                {/* Не `truncate`: в плитке половина ширины экрана, и название
                    лучшего места почти всегда длиннее одной строки. «Музей
                    М…» не говорит ничего — пусть лучше займёт две строки. */}
                <div className="mt-2.5 line-clamp-2 font-display text-[26px] leading-[1.1] font-medium tracking-[-.01em] break-words text-fg">
                  {item.value}
                </div>
                <div className="mt-[7px] text-[12.5px] text-fg-dim">{item.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-[20px] bg-surface-2 p-5">
            <div className="text-xs font-semibold tracking-[.1em] text-fg-muted uppercase">куда ходим чаще</div>
            <div className="mt-4 flex flex-col gap-3">
              {stats.byCategory.map((bar) => (
                <div key={bar.label}>
                  {/* На телефоне подпись стоит над полосой, а не слева: колонка
                      в 88px съедала бы четверть ширины экрана. */}
                  <div className="flex justify-between gap-3 text-[13px] text-fg-body">
                    <div className="truncate">{bar.label}</div>
                    <div className="flex-none text-fg-dimmer">{bar.count}</div>
                  </div>
                  <Track share={bar.share} className="mt-[7px] h-[7px]" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/** Тёмно-зелёный из макета — только под главной цифрой года. */
const HERO_BG = '#0F3D33'
const HERO_GLOW = 'radial-gradient(closest-side, rgb(78 229 96 / .32), rgb(78 229 96 / 0))'

function Track({ share, className }: { share: number; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-pill bg-surface-4', className)}>
      {/* Минимум 4% — иначе одиночный поход даёт полосу в один пиксель,
          неотличимую от пустой дорожки. */}
      <div
        className="h-full rounded-pill bg-accent transition-[width] duration-500"
        style={{ width: `${Math.max(share * 100, 4)}%` }}
      />
    </div>
  )
}

/** Одни и те же четыре цифры на обеих раскладках — различается только подача. */
function statItems(stats: YearStats): { label: string; value: string; note: ReactNode }[] {
  return [
    {
      label: 'разных мест',
      value: String(stats.places),
      note: stats.places < stats.visits ? 'куда-то возвращались' : 'каждое по разу',
    },
    {
      label: 'отзывов',
      value: String(stats.reviews),
      note: stats.reviews >= stats.visits * 2 ? 'писали оба' : 'не про всё написали',
    },
    {
      label: 'средняя оценка',
      value: stats.averageRating !== null ? formatRating(stats.averageRating) : '—',
      note: stats.averageRating !== null ? 'по нашим отзывам' : 'оценок пока нет',
    },
    {
      label: 'лучшее',
      value: stats.best?.title ?? '—',
      note: stats.best ? (stats.best.category?.name ?? 'без категории') : 'ещё не выбрали',
    },
  ]
}

function plural(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'походов'
  const mod10 = n % 10
  if (mod10 === 1) return 'поход'
  if (mod10 >= 2 && mod10 <= 4) return 'похода'
  return 'походов'
}
