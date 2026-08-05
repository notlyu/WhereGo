import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'

import { isLocalBackend, LOCAL_PASSWORD, SEED_PROFILES } from '@/api'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/auth-context'

/**
 * А-1…А-5. Композиция — с экрана входа прототипа: свечение, «Куда пойти»
 * шрифтом Playfair, поля прижаты к низу, пилюля-кнопка.
 *
 * Отличие от прототипа: там инвайт-код, в ТЗ (А-1) — email и пароль. Аккаунты
 * заводятся вручную в дашборде Supabase, публичная регистрация выключена (А-2),
 * поэтому нижняя строка про закрытую регистрацию сохранена.
 */
export function LoginPage() {
  const { profile, ready, signIn } = useAuth()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (ready && profile) {
    const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname
    return <Navigate to={from ?? '/'} replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не получилось войти.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-bg px-7 pb-8">
      <div className="glow-accent pointer-events-none absolute -top-40 -right-16 -left-16 h-[420px]" />

      <div className="relative mx-auto w-full max-w-[420px] pt-16">
        <div className="eyebrow">только для двоих</div>
        <h1 className="mt-4 font-display text-[62px] leading-[.98] font-medium tracking-[-.02em] text-fg">
          Куда
          <br />
          пойти
        </h1>
        <p className="mt-[18px] max-w-[280px] text-base leading-[1.55] text-fg-muted text-pretty">
          Наши места, наши походы, наши впечатления. Всё в одном месте — и никого лишнего.
        </p>
      </div>

      <form onSubmit={onSubmit} className="relative mx-auto mt-auto flex w-full max-w-[420px] flex-col gap-3 pt-16">
        <label className="eyebrow" htmlFor="email">
          адрес почты
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ты@почта.рф"
          className="h-14 rounded-card bg-surface-2 px-5 text-[17px] text-fg outline-none placeholder:text-fg-dimmer focus:ring-1 focus:ring-border-3"
        />

        <label className="eyebrow mt-2" htmlFor="password">
          пароль
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="h-14 rounded-card bg-surface-2 px-5 text-[17px] text-fg outline-none placeholder:text-fg-dimmer focus:ring-1 focus:ring-border-3"
        />

        {error ? <div className="text-[13.5px] text-[#FF7A6B]">{error}</div> : null}

        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? 'Входим…' : 'Войти'}
        </Button>

        <div className="px-2 pt-1.5 pb-1 text-center text-[12.5px] text-fg-dim">
          Регистрация закрыта. Аккаунт заводит тот, кто уже внутри.
        </div>

        {isLocalBackend ? <LocalHint /> : null}
      </form>
    </div>
  )
}

/** Подсказка только для локального бэкенда: на боевом её не существует. */
function LocalHint() {
  return (
    <div className="rounded-card bg-surface-1 px-4 py-3 text-center text-[12.5px] leading-relaxed text-fg-dim">
      Supabase ещё не подключён — работают демо-данные.
      <br />
      Вход: <span className="text-fg-muted">{SEED_PROFILES.map((p) => p.email).join(' / ')}</span>, пароль{' '}
      <span className="text-fg-muted">{LOCAL_PASSWORD}</span>
    </div>
  )
}
