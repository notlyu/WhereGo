import { Download, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { backup as backupApi, isLocalBackend } from '@/api'
import { Button } from '@/components/ui/Button'
import { FieldError, Input, Label } from '@/components/ui/Field'
import { useAuth } from '@/hooks/auth-context'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'

/** Н-1…Н-3, А-6, А-7: резервная копия, имя, аватар, пароль. */
export function SettingsPage() {
  const isDesktop = useIsDesktop()

  return (
    <div className={cn(isDesktop ? 'max-w-[720px]' : 'px-5 pt-3.5 pb-8')}>
      <div className={cn('font-semibold tracking-[.1em] uppercase', isDesktop ? 'text-[11.5px] text-fg-muted' : 'eyebrow')}>
        аккаунт
      </div>
      <h1
        className={cn(
          'font-display font-medium tracking-[-.02em] text-fg',
          isDesktop ? 'mt-2 text-[44px] leading-none' : 'mt-1.5 text-[30px]',
        )}
      >
        Настройки
      </h1>

      <BackupCard desktop={isDesktop} />
      <ProfileCard desktop={isDesktop} />
      <PasswordCard desktop={isDesktop} />
    </div>
  )
}

/**
 * Н-1: резервная копия одной кнопкой.
 *
 * По расписанию не делаем намеренно: внешний cron — ещё одна зависимость,
 * которая тихо отвалится, и обнаружится это ровно тогда, когда копия
 * понадобится. Кнопке ломаться нечем.
 */
function BackupCard({ desktop }: { desktop: boolean }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    setError(null)
    try {
      const dump = await backupApi()
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = `kuda-poyti-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)

      const records = Object.values(dump).filter(Array.isArray).reduce((sum, rows) => sum + rows.length, 0)
      setDone(`${records} ${pluralRecords(records)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не получилось собрать копию')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card desktop={desktop} title="Резервная копия">
      <p className="text-[13px] leading-relaxed text-fg-dim">
        Скачивает все записи одним JSON: места, отзывы, планы, метки, голоса. Фотографии — ссылками, сами файлы
        остаются в хранилище.
      </p>

      <Button size="md" onClick={() => void download()} disabled={busy} className="mt-4">
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
        {busy ? 'Собираем…' : 'Скачать копию'}
      </Button>

      {done ? <div className="mt-3 text-[13px] text-accent">Готово — {done}.</div> : null}
      {error ? <div className="mt-3 text-[13px] text-[#FF7A6B]">{error}</div> : null}
    </Card>
  )
}

/** А-6, Н-2: имя и аватар. */
function ProfileCard({ desktop }: { desktop: boolean }) {
  const { profile, refresh } = useAuth()
  const [name, setName] = useState(profile?.displayName ?? '')
  const [avatar, setAvatar] = useState(profile?.avatarUrl ?? '')
  const [state, setState] = useState<{ busy: boolean; error: string | null; saved: boolean }>({
    busy: false,
    error: null,
    saved: false,
  })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    setState({ busy: true, error: null, saved: false })
    try {
      await refresh({ displayName: name.trim(), avatarUrl: avatar.trim() || null })
      setState({ busy: false, error: null, saved: true })
    } catch (cause) {
      setState({ busy: false, error: cause instanceof Error ? cause.message : 'Не сохранилось', saved: false })
    }
  }

  return (
    <Card desktop={desktop} title="Профиль">
      <form onSubmit={submit}>
        <Label>имя</Label>
        <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Как вас зовут" />

        <div className="mt-4">
          <Label hint="ссылка на картинку">аватар</Label>
          <Input
            value={avatar}
            onChange={(event) => setAvatar(event.target.value)}
            placeholder="Оставьте пустым — будут инициалы"
            inputMode="url"
          />
        </div>

        <FieldError>{state.error}</FieldError>
        {state.saved ? <div className="mt-3 text-[13px] text-accent">Сохранено.</div> : null}

        <Button type="submit" size="md" disabled={state.busy || !name.trim()} className="mt-4">
          {state.busy ? 'Сохраняем…' : 'Сохранить'}
        </Button>
      </form>
    </Card>
  )
}

/** А-7, Н-3: смена пароля. */
function PasswordCard({ desktop }: { desktop: boolean }) {
  const { changePassword } = useAuth()
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [state, setState] = useState<{ busy: boolean; error: string | null; saved: boolean }>({
    busy: false,
    error: null,
    saved: false,
  })

  const mismatch = repeat.length > 0 && next !== repeat
  const tooShort = next.length > 0 && next.length < 8

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (mismatch || tooShort || !next) return

    setState({ busy: true, error: null, saved: false })
    try {
      await changePassword(next)
      setNext('')
      setRepeat('')
      setState({ busy: false, error: null, saved: true })
    } catch (cause) {
      setState({ busy: false, error: cause instanceof Error ? cause.message : 'Не получилось', saved: false })
    }
  }

  return (
    <Card desktop={desktop} title="Пароль">
      <form onSubmit={submit}>
        <Label hint="не короче 8 символов">новый пароль</Label>
        <Input
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          placeholder="••••••••"
        />

        <div className="mt-4">
          <Label>ещё раз</Label>
          <Input
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            placeholder="••••••••"
          />
        </div>

        <FieldError>{tooShort ? 'Слишком короткий' : mismatch ? 'Пароли не совпадают' : state.error}</FieldError>
        {state.saved ? <div className="mt-3 text-[13px] text-accent">Пароль изменён.</div> : null}

        {isLocalBackend ? (
          <div className="mt-3 text-[12.5px] text-fg-dim">В демо-режиме пароль не меняется.</div>
        ) : null}

        <Button
          type="submit"
          size="md"
          disabled={state.busy || !next || mismatch || tooShort}
          className="mt-4"
        >
          {state.busy ? 'Меняем…' : 'Сменить пароль'}
        </Button>
      </form>
    </Card>
  )
}

function Card({ desktop, title, children }: { desktop: boolean; title: string; children: React.ReactNode }) {
  return (
    <section className={cn('mt-6 rounded-card p-5', desktop ? 'bg-surface-d' : 'bg-surface-2')}>
      <h2 className="mb-3 text-base font-semibold text-fg">{title}</h2>
      {children}
    </section>
  )
}

function pluralRecords(n: number): string {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return 'записей'
  const mod10 = n % 10
  if (mod10 === 1) return 'запись'
  if (mod10 >= 2 && mod10 <= 4) return 'записи'
  return 'записей'
}
