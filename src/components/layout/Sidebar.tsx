import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, NavLink } from 'react-router'

import { Avatar } from '@/components/ui/Avatar'
import { useAuth } from '@/hooks/auth-context'
import { usePlaces } from '@/hooks/queries'
import { cn } from '@/lib/cn'

import { SIDEBAR_ITEMS } from './nav-items'

/** Десктопная навигация (≥ 900px): боковая панель 252px со счётчиками. */
export function Sidebar() {
  const { profile } = useAuth()
  const { data: places = [] } = usePlaces()

  // «Ly и я» — подпись из макета. Имя второго берём из авторов мест:
  // отдельного справочника людей ради двух человек заводить незачем.
  const other = places.find((place) => place.author && place.author.id !== profile?.id)?.author
  const subtitle = other ? `${other.displayName} и я` : 'только для двоих'

  const counts = useMemo<Record<string, number | null>>(
    () => ({
      '/': places.filter((place) => !place.isIdea).length,
      '/ideas': places.filter((place) => place.isIdea).length,
      '/history': places.filter((place) => place.status === 'visited').length,
    }),
    [places],
  )

  return (
    <aside className="sticky top-0 hidden h-screen w-[252px] flex-none flex-col gap-7 border-r border-border px-[18px] py-7 desktop:flex">
      <Link to="/" className="px-2.5">
        <div className="font-display text-[26px] leading-[1.05] font-medium tracking-[-.02em] text-fg">Куда пойти</div>
        <div className="mt-1.5 text-[11.5px] font-semibold tracking-[.1em] text-fg-dim uppercase">{subtitle} · Петербург</div>
      </Link>

      <div className="flex flex-col gap-1">
        {SIDEBAR_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex h-[46px] cursor-pointer items-center gap-3 rounded-field px-3.5 text-[14.5px] font-semibold transition-colors',
                isActive ? 'bg-border text-fg' : 'text-fg-muted hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} className="w-5 flex-none" />
                <span className="flex-1">{label}</span>
                {counts[to] ? (
                  <span className={cn('text-xs font-semibold', isActive ? 'text-fg-dim' : 'text-fg-faint')}>{counts[to]}</span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <Link
        to="/place/new"
        className="flex h-12 items-center justify-center gap-2 rounded-pill bg-accent text-[14.5px] font-bold text-on-accent transition-colors hover:bg-accent-hover"
      >
        <Plus size={17} />
        Добавить место
      </Link>

      <Link
        to="/profile"
        className="mt-auto flex items-center gap-3 rounded-card bg-surface-1 p-3 transition-colors hover:bg-surface-2"
      >
        {other ? <Avatar name={other.displayName} url={other.avatarUrl} size={36} /> : null}
        <Avatar
          name={profile?.displayName ?? '?'}
          url={profile?.avatarUrl}
          size={36}
          accent
          className={other ? '-ml-5 border-[3px] border-surface-1' : undefined}
        />
        <div className="min-w-0 flex-1 truncate pl-1 text-[13.5px] font-semibold text-fg">Профиль</div>
        <div className="text-[13px] text-fg-faint">→</div>
      </Link>
    </aside>
  )
}
