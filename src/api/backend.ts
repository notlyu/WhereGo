import type { Category, Photo, Place, PlaceInput, PlaceStatus, Plan, PlanInput, Profile, Review, ReviewInput, Tag, Vote } from '@/types/models'

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

  tags: {
    list(): Promise<Tag[]>
    /**
     * М-11: заменяет набор меток места целиком.
     *
     * Новые названия заводятся сами: справочник общий и пополняется по ходу,
     * отдельного экрана управления метками в ТЗ нет.
     */
    setForPlace(placeId: string, names: string[]): Promise<Tag[]>
  }

  plans: {
    list(): Promise<Plan[]>
    create(input: PlanInput): Promise<Plan>
    update(id: string, input: PlanInput): Promise<Plan>
    remove(id: string): Promise<void>
  }

  votes: {
    /** Все голоса обоих: по ним считаются и совпадения, и «что я ещё не видел». */
    list(): Promise<Vote[]>
    /** В-1: повторный свайп по тому же месту переписывает свой голос. */
    cast(placeId: string, wants: boolean): Promise<Vote>
  }

  photos: {
    /** Фото места и фото его отзывов приходят одним запросом. */
    listForPlace(placeId: string): Promise<Photo[]>
    /**
     * Ф-4: файл уходит в хранилище напрямую, минуя приложение.
     * `blob` уже сжат на клиенте (Ф-3) — сюда попадает готовый WebP.
     */
    upload(target: PhotoTarget, blob: Blob, size: { width: number; height: number }): Promise<Photo>
    /** Ф-5: удаляется и запись, и сам файл. */
    remove(id: string): Promise<void>
    /** Сколько занято в хранилище — для счётчика в настройках. */
    usage(): Promise<{ files: number; bytes: number }>
  }
}

/** Фото принадлежит либо месту, либо отзыву — ограничение `check` в БД. */
export type PhotoTarget = { placeId: string; reviewId?: never } | { reviewId: string; placeId?: never }

/** Ошибка, которую интерфейс показывает пользователю дословно. */
export class ApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}
