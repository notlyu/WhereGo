import type { Category, Place, PlaceInput, PlaceStatus, Profile, Review, ReviewInput } from '@/types/models'

/**
 * Контракт бэкенда.
 *
 * Приложение знает только его. Реализаций две:
 *   • `supabase/` — боевая;
 *   • `local/`    — localStorage с сидовыми данными, чтобы работать до того,
 *                   как заведён проект Supabase.
 *
 * Выбор — в `index.ts` по переменным окружения.
 */
export interface Backend {
  readonly kind: 'supabase' | 'local'

  auth: {
    /** Текущий пользователь или null. Читает сохранённую сессию (А-4). */
    current(): Promise<Profile | null>
    signIn(email: string, password: string): Promise<Profile>
    signOut(): Promise<void>
    /** Подписка на смену сессии. Возвращает функцию отписки. */
    subscribe(onChange: (profile: Profile | null) => void): () => void
  }

  categories: {
    list(): Promise<Category[]>
    create(name: string, emoji?: string | null): Promise<Category>
    rename(id: string, name: string): Promise<Category>
    remove(id: string): Promise<void>
  }

  places: {
    list(): Promise<Place[]>
    get(id: string): Promise<Place | null>
    create(input: PlaceInput): Promise<Place>
    update(id: string, input: PlaceInput): Promise<Place>
    remove(id: string): Promise<void>
    /** М-5: статус меняет любой авторизованный, через `set_place_status`. */
    setStatus(id: string, status: PlaceStatus): Promise<void>
  }

  reviews: {
    listForPlace(placeId: string): Promise<Review[]>
    /**
     * О-1: у пользователя один отзыв на место, поэтому не create, а upsert.
     * Повторное сохранение правит существующий, а не заводит второй.
     */
    save(placeId: string, input: ReviewInput): Promise<Review>
    /** О-4: удалить можно только свой — держит RLS. */
    remove(id: string): Promise<void>
  }
}

/** Ошибка, которую интерфейс показывает пользователю дословно. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}
