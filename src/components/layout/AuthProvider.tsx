import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { auth } from '@/api'
import { AuthContext, type AuthValue } from '@/hooks/auth-context'
import type { Profile } from '@/types/models'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [ready, setReady] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    let alive = true

    // А-4: восстанавливаем сессию до первой отрисовки защищённых экранов.
    auth
      .current()
      .then((value) => {
        if (alive) setProfile(value)
      })
      .catch(() => {
        if (alive) setProfile(null)
      })
      .finally(() => {
        if (alive) setReady(true)
      })

    const unsubscribe = auth.subscribe((value) => {
      if (alive) setProfile(value)
    })

    return () => {
      alive = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setProfile(await auth.signIn(email, password))
  }, [])

  const signOut = useCallback(async () => {
    await auth.signOut()
    setProfile(null)
    // Кэш держит чужие места и категории — после выхода он не наш.
    queryClient.clear()
  }, [queryClient])

  const refresh = useCallback(
    async (patch: { displayName?: string; avatarUrl?: string | null }) => {
      const next = await auth.updateProfile(patch)
      setProfile(next)
      // Имя автора показано в ленте и на местах — их надо перечитать.
      void queryClient.invalidateQueries()
    },
    [queryClient],
  )

  const changePassword = useCallback(async (next: string) => {
    await auth.changePassword(next)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ profile, ready, signIn, signOut, refresh, changePassword }),
    [profile, ready, signIn, signOut, refresh, changePassword],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
