import { createBrowserRouter } from 'react-router'

import { AppShell } from '@/components/layout/AppShell'
import { ErrorScreen } from '@/components/layout/ErrorScreen'
import { lazyImport } from '@/components/layout/lazyImport'
import { LazyRoute } from '@/components/layout/LazyRoute'
import { RequireAuth } from '@/components/layout/RequireAuth'
import { LoginPage } from '@/features/auth/LoginPage'
import { FeedPage } from '@/features/feed/FeedPage'
import { PlacePage } from '@/features/place/PlacePage'

// П-1: бюджет бандла — 250 КБ gzip, и MapLibre на Этапе 3 съест больше половины.
// Поэтому всё, что не на горячем пути «вошёл → лента → место», уезжает в
// отдельные чанки. Форма, профиль и экраны следующих этапов грузятся по клику.
const IdeasPage = lazyImport(() => import('@/features/feed/IdeasPage'), 'IdeasPage')
const MapPage = lazyImport(() => import('@/features/map/MapPage'), 'MapPage')
const MatchesPage = lazyImport(() => import('@/features/swipe/MatchesPage'), 'MatchesPage')
const SwipePage = lazyImport(() => import('@/features/swipe/SwipePage'), 'SwipePage')
const PlansPage = lazyImport(() => import('@/features/plans/PlansPage'), 'PlansPage')
const HistoryPage = lazyImport(() => import('@/features/history/HistoryPage'), 'HistoryPage')
const YearPage = lazyImport(() => import('@/features/history/YearPage'), 'YearPage')
const SettingsPage = lazyImport(() => import('@/features/settings/SettingsPage'), 'SettingsPage')
const PlaceFormPage = lazyImport(() => import('@/features/place-form/PlaceFormPage'), 'PlaceFormPage')
const ProfilePage = lazyImport(() => import('@/features/profile/ProfilePage'), 'ProfilePage')
const StubPage = lazyImport(() => import('@/features/stubs/StubPage'), 'StubPage')

// Карта экранов — из Design-System.md. Экраны этапов 3–5 заведены заглушками,
// чтобы навигация была целой с самого начала.
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <ErrorScreen /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    // Без этого React Router показывает свой английский экран с советом
    // разработчику — на боевом сайте это выглядит как полная поломка.
    errorElement: <ErrorScreen />,
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
      { path: 'history', element: <LazyRoute><HistoryPage /></LazyRoute> },
      { path: 'year', element: <LazyRoute><YearPage /></LazyRoute> },
      { path: 'settings', element: <LazyRoute><SettingsPage /></LazyRoute> },

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
