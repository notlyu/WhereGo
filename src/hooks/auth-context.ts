import { createContext, use } from 'react'

import type { Profile } from '@/types/models'

export interface AuthValue {
  /** null — не вошли; undefined невозможен, пока `ready` не станет true. */
  profile: Profile | null
  /** Сессия прочитана. До этого показываем заставку, а не экран входа. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** А-6, Н-2: правка своего профиля. Обновляет и то, что показано на экране. */
  refresh: (patch: { displayName?: string; avatarUrl?: string | null }) => Promise<void>
  /** А-7, Н-3. */
  changePassword: (next: string) => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth вызван вне <AuthProvider>')
  return value
}
