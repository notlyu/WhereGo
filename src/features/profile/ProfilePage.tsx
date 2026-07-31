import { Settings } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { isLocalBackend, resetLocalStore } from '@/api'
import { PROFILE_MENU } from '@/components/layout/nav-items'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/auth-context'
import { usePlaces } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'

/** Н-4 (выход) — обязателен уже на этапе 1. Имя, аватар и пароль — этап 5. */
export function ProfilePage() {
  const { profile, signOut } = useAuth()
  const isDesktop = useIsDesktop()
  const { data: places = [] } = usePlaces()
  const [busy, setBusy] = useState(false)

  const other = places.find((place) => place.author && place.author.id !== profile?.id)?.author

  const notes = useMemo<Record<string, string>>(() => {
    const visited = places.filter((place) => place.status === 'visited').length
    const ideas = places.filter((place) => place.isIdea).length
    return {
      '/plans': 'ближайших планов пока нет',
      '/history': visited ? `${visited} ${plural(visited, 'поход', 'похода', 'походов')}` : 'ещё никуда не сходили',
      '/year': 'собираются сами',
      '/ideas': ideas ? `${ideas} ${plural(ideas, 'ждёт', 'ждут', 'ждут')}` : 'пока пусто',
    }
  }, [places])

  async function onSignOut() {
    setBusy(true)
    try {
      await signOut()
    } finally {
      setBusy(false)
    }
  }

  // ── Десктоп: экран аккаунта, разделы уже есть в боковой панели ───────────
  if (isDesktop) {
    return (
      <div className="max-w-[720px]">
        <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">аккаунт</div>
        <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Профиль</h1>

        <div className="mt-7 flex items-center gap-5">
          <Avatar name={profile?.displayName ?? '?'} url={profile?.avatarUrl} size={88} accent />
          <div className="flex flex-col gap-2">
            <div className="text-xl font-semibold text-fg">{profile?.displayName}</div>
            <div className="text-[12.5px] text-fg-dim">Имя, фото и смена пароля — этап 5</div>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-4">
          <Stat value={places.filter((p) => !p.isIdea).length} label="мест всего" />
          <Stat value={places.filter((p) => p.authorId === profile?.id && !p.isIdea).length} label="добавили вы" />
          <Stat value={places.filter((p) => p.status === 'visited').length} label="уже сходили" />
          <Stat value={places.filter((p) => p.isIdea).length} label="идей в списке" />
        </div>

        {isLocalBackend ? <LocalNote /> : null}

        <Button variant="surface" onClick={() => void onSignOut()} disabled={busy} className="mt-7 w-[220px] bg-surface-d hover:bg-surface-2">
          {busy ? 'Выходим…' : 'Выйти'}
        </Button>
      </div>
    )
  }

  // ── Телефон: заодно вход в разделы, не поместившиеся в четыре вкладки ────
  return (
    <div className="relative px-5 pt-5">
      <div className="glow-accent pointer-events-none absolute -top-60 -right-20 -left-20 h-[400px] opacity-60" />

      <div className="relative flex items-center gap-3.5">
        {other ? <Avatar name={other.displayName} url={other.avatarUrl} size={58} /> : null}
        <Avatar
          name={profile?.displayName ?? '?'}
          url={profile?.avatarUrl}
          size={58}
          accent
          className={other ? '-ml-[22px] border-[3px] border-bg' : undefined}
        />
        <div className="ml-2 flex-1">
          <div className="font-display text-[26px] font-medium tracking-[-.01em] text-fg">
            {other ? `${other.displayName} и я` : (profile?.displayName ?? 'Мы')}
          </div>
        </div>
        <Link
          to="/settings"
          aria-label="Настройки"
          className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <Settings size={17} />
        </Link>
      </div>

      <div className="mt-[26px] flex flex-col gap-2.5">
        {PROFILE_MENU.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex min-h-14 items-center gap-3.5 rounded-[18px] bg-surface-2 p-[18px] transition-colors hover:bg-surface-4"
          >
            <div className="flex-1">
              <div className="text-base font-semibold text-fg">{item.title}</div>
              <div className="mt-1 text-[13px] text-fg-dim">{notes[item.to]}</div>
            </div>
            <div className="text-base text-fg-faint">→</div>
          </Link>
        ))}
      </div>

      {isLocalBackend ? <LocalNote /> : null}

      <button
        type="button"
        onClick={() => void onSignOut()}
        disabled={busy}
        className="mt-[22px] w-full cursor-pointer p-3 text-center text-sm text-fg-dim transition-colors hover:text-fg disabled:opacity-50"
      >
        {busy ? 'Выходим…' : 'Выйти'}
      </button>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-card bg-surface-d px-5 py-4">
      <div className="font-display text-[30px] leading-none font-medium text-fg">{value}</div>
      <div className="mt-2 text-[13px] text-fg-dim">{label}</div>
    </div>
  )
}

function LocalNote() {
  return (
    <div className="mt-6 rounded-card bg-surface-2 p-4 desktop:bg-surface-d">
      <div className="text-sm font-semibold text-fg">Демо-данные</div>
      <div className="mt-1.5 text-[13px] leading-relaxed text-fg-dim">
        Supabase не подключён — места лежат в localStorage этого браузера. Второй человек их не увидит.
      </div>
      <Button
        variant="surface"
        size="md"
        className="mt-3.5"
        onClick={() => {
          resetLocalStore()
          location.reload()
        }}
      >
        Вернуть исходные данные
      </Button>
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}
