import { createContext, use } from 'react'

import type { Profile } from '@/types/models'

export interface AuthValue {
  /** null — не вошли; undefined невозможен, пока `ready` не станет true. */
  profile: Profile | null
  /** Сессия прочитана. До этого показываем заставку, а не экран входа. */
  ready: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthValue | null>(null)

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth вызван вне <AuthProvider>')
  return value
}
