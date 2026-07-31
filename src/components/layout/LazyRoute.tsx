import { Suspense, type ReactNode } from 'react'

/** Обёртка ленивых маршрутов: заглушка вместо белого экрана, пока едет чанк. */
export function LazyRoute({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-5 mt-6 h-[60vh] animate-pulse rounded-card bg-surface-2" />}>{children}</Suspense>
  )
}
