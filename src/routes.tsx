import { lazy } from 'react'
import { createBrowserRouter } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { LazyRoute } from '@/components/layout/LazyRoute'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { PlacePage } from '@/features/place/PlacePage'

// П-1: бюджет бандла — 250 КБ gzip, и MapLibre на Этапе 3 съест больше половины.
// Поэтому всё, что не на горячем пути «вошёл → лента → место», уезжает в
// отдельные чанки. Форма, профиль и экраны следующих этапов грузятся по клику.
const IdeasPage = lazy(() => import('@/features/feed/IdeasPage').then((m) => ({ default: m.IdeasPage })))
const MapPage = lazy(() => import('@/features/map/MapPage').then((m) => ({ default: m.MapPage })))
const MatchesPage = lazy(() => import('@/features/swipe/MatchesPage').then((m) => ({ default: m.MatchesPage })))
const SwipePage = lazy(() => import('@/features/swipe/SwipePage').then((m) => ({ default: m.SwipePage })))
const PlansPage = lazy(() => import('@/features/plans/PlansPage').then((m) => ({ default: m.PlansPage })))
const PlaceFormPage = lazy(() => import('@/features/place-form/PlaceFormPage').then((m) => ({ default: m.PlaceFormPage })))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const StubPage = lazy(() => import('@/features/stubs/StubPage').then((m) => ({ default: m.StubPage })))

// Карта экранов — из Design-System.md. Экраны этапов 3–5 заведены заглушками,
// чтобы навигация была целой с самого начала.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <FeedPage /> },
      { path: 'ideas', element: <LazyRoute><IdeasPage /></LazyRoute> },
      { path: 'place/new', element: <LazyRoute><PlaceFormPage /></LazyRoute> },
      { path: 'place/:id', element: <PlacePage /> },
      { path: 'place/:id/edit', element: <LazyRoute><PlaceFormPage /></LazyRoute> },
      { path: 'profile', element: <LazyRoute><ProfilePage /></LazyRoute> },

      { path: 'map', element: <LazyRoute><MapPage /></LazyRoute> },
      { path: 'swipe', element: <LazyRoute><SwipePage /></LazyRoute> },
      { path: 'matches', element: <LazyRoute><MatchesPage /></LazyRoute> },
      { path: 'plans', element: <LazyRoute><PlansPage /></LazyRoute> },
      {
        path: 'history',
        element: (
          <LazyRoute>
            <StubPage title="Мы были тут" stage={5} what="Хронология походов со счётчиком: где были, когда и что подумали." />
          </LazyRoute>
        ),
      },
      {
        path: 'year',
        element: (
          <LazyRoute>
            <StubPage title="Итоги года" stage={5} what="Статистика за год и полосы по категориям — куда мы ходим чаще всего." />
          </LazyRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <LazyRoute>
            <StubPage title="Настройки" stage={5} what="Резервная копия одной кнопкой, смена имени, аватара и пароля." />
          </LazyRoute>
        ),
      },

      {
        path: '*',
        element: (
          <LazyRoute>
            <StubPage title="Такой страницы нет" stage={1} what="Ссылка ведёт в никуда — возможно, экран ещё не сделан." />
          </LazyRoute>
        ),
      },
    ],
  },
])
