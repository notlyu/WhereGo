// Доменные типы приложения.
//
// Это НЕ типы строк Postgres — те живут в `database.ts` и генерируются командой
// `pnpm types:gen`. Здесь то, чем оперирует интерфейс: слой `src/api/` переводит
// одно в другое. Благодаря этому замена бэкенда не расходится по экранам.

export type PlaceStatus = 'want' | 'visited' | 'rejected'
export type PriceLevel = 'free' | 'low' | 'medium' | 'high'

export interface Profile {
  id: string
  displayName: string
  avatarUrl: string | null
}

export interface Category {
  id: string
  name: string
  emoji: string | null
  sortOrder: number
}

export interface Place {
  id: string
  title: string
  categoryId: string | null
  status: PlaceStatus
  isIdea: boolean
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  sourceUrl: string | null
  sourceTitle: string | null
  price: PriceLevel | null
  authorId: string
  createdAt: string
  updatedAt: string

  /** Догружается вместе с местом — используется в ленте и на карточке. */
  category: Category | null
  author: Profile | null
  /** Средняя оценка по отзывам обоих; null — ещё не были (Этап 2). */
  rating: number | null
  /** Первое фото места; null — показываем штриховку (Этап 2). */
  coverUrl: string | null
}

/** Поля, которые пользователь заполняет в форме места. */
export interface PlaceInput {
  title: string
  categoryId: string | null
  description: string | null
  address: string | null
  lat: number | null
  lng: number | null
  sourceUrl: string | null
  sourceTitle: string | null
  price: PriceLevel | null
  isIdea: boolean
}

export const PLACE_STATUS_LABEL: Record<PlaceStatus, string> = {
  want: 'хочу сходить',
  visited: 'были',
  rejected: 'не зашло',
}

export const PRICE_LABEL: Record<PriceLevel, string> = {
  free: 'бесплатно',
  low: '₽',
  medium: '₽₽',
  high: '₽₽₽',
}

/** Короткая форма для метаданных в карточке: «кафе · ₽₽ · 2.4 км». */
export const PRICE_SHORT: Record<PriceLevel, string> = {
  free: '0 ₽',
  low: '₽',
  medium: '₽₽',
  high: '₽₽₽',
}
