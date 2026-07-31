import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'

import { useAuth } from '@/hooks/auth-context'

/** А-5: неавторизованный видит только `/login`. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { profile, ready } = useAuth()
  const location = useLocation()

  // Пока сессия не прочитана, не показываем ни ленту, ни экран входа —
  // иначе при каждом запуске мигает логин, хотя пользователь давно вошёл.
  if (!ready) return <Splash />

  if (!profile) return <Navigate to="/login" replace state={{ from: location }} />

  return <>{children}</>
}

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg">
      <div className="font-display text-3xl font-medium tracking-[-.02em] text-fg-dim">Куда пойти</div>
    </div>
  )
}
