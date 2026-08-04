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
  /** М-11: метки места. */
  tags: Tag[]
}

/** М-11: произвольная метка. Справочник общий, привязка — в `place_tags`. */
export interface Tag {
  id: string
  name: string
}

/** План похода (В-3, В-4): место, дата, время и записка. */
export interface Plan {
  id: string
  placeId: string
  /** YYYY-MM-DD. Дата обязательна, время — нет. */
  plannedDate: string
  /** HH:MM или null: «сходим в субботу» — тоже план. */
  plannedTime: string | null
  note: string | null
  createdBy: string
  place: Place | null
}

export interface PlanInput {
  placeId: string
  plannedDate: string
  plannedTime: string | null
  note: string | null
}

/**
 * Голос в свайпах (В-1). Голос индивидуальный: у каждого свой по каждому месту.
 * Ключ — пара (place_id, user_id), поэтому пересвайпать можно, а раздвоиться нет.
 */
export interface Vote {
  placeId: string
  userId: string
  wants: boolean
}

/** Фотография места или отзыва. Файл в хранилище, здесь только ссылка. */
export interface Photo {
  id: string
  placeId: string | null
  reviewId: string | null
  /** Путь в бакете — нужен, чтобы удалить сам файл, а не только запись. */
  storageKey: string
  url: string
  width: number | null
  height: number | null
  sortOrder: number
  uploadedBy: string
}

/** Ф-1: больше десяти фото на место не берём. */
export const MAX_PHOTOS_PER_PLACE = 10

/**
 * Отзыв. О-1: один на место от каждого — ограничение стоит в БД
 * (`unique (place_id, author_id)`), а не только в интерфейсе.
 */
export interface Review {
  id: string
  placeId: string
  authorId: string
  /** 1…5, ограничение `check` в БД. */
  rating: number
  text: string | null
  /** Дата посещения в формате YYYY-MM-DD; null — не указали. */
  visitedAt: string | null
  createdAt: string
  author: Profile | null
}

export interface ReviewInput {
  rating: number
  text: string | null
  visitedAt: string | null
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
