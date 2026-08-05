import type { Category, Photo, Place, PlaceInput, PlaceStatus, Plan, PlanInput, Profile, Review, ReviewInput, Tag, Vote } from '@/types/models'

import { ApiError, type Backend, type PhotoTarget } from '../backend'
import { LOCAL_PASSWORD, SEED_CATEGORIES, SEED_IDEAS, SEED_PLACES, SEED_PROFILES, SEED_REVIEWS } from './seed'

/**
 * Локальный бэкенд: те же операции, но поверх localStorage.
 *
 * Нужен, пока не заведён проект Supabase, — чтобы экраны можно было открыть и
 * проверить. Включается сам, когда в окружении нет VITE_SUPABASE_*.
 * Права здесь имитируются, а не проверяются: настоящая защита — RLS (Б-3).
 */

const STORE_KEY = 'kuda-poyti/local-store/v1'
const SESSION_KEY = 'kuda-poyti/local-session/v1'

interface Store {
  categories: Category[]
  places: Place[]
  reviews: Review[]
  photos: Photo[]
  votes: Vote[]
  plans: Plan[]
  tags: Tag[]
  placeTags: { placeId: string; tagId: string }[]
}

function nowMinusDays(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

function seedStore(): Store {
  const byId = new Map(SEED_CATEGORIES.map((c) => [c.id, c]))
  const profiles = new Map(SEED_PROFILES.map((p) => [p.id, { id: p.id, displayName: p.displayName, avatarUrl: p.avatarUrl }]))

  const places: Place[] = SEED_PLACES.map((p) => ({
    id: p.id,
    title: p.title,
    categoryId: p.categoryId,
    status: p.status,
    isIdea: false,
    description: p.description,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    sourceUrl: 'https://example.com/',
    sourceTitle: p.sourceTitle,
    price: p.price,
    authorId: p.authorId,
    createdAt: nowMinusDays(p.daysAgo),
    updatedAt: nowMinusDays(p.daysAgo),
    category: byId.get(p.categoryId) ?? null,
    author: profiles.get(p.authorId) ?? null,
    rating: p.rating,
    coverUrl: null,
    tags: [],
    openingHours: null,
  }))

  const ideas: Place[] = SEED_IDEAS.map((i) => ({
    id: i.id,
    title: i.title,
    categoryId: null,
    status: 'want',
    isIdea: true,
    description: null,
    address: null,
    lat: null,
    lng: null,
    sourceUrl: null,
    sourceTitle: null,
    price: null,
    authorId: i.authorId,
    createdAt: nowMinusDays(i.daysAgo),
    updatedAt: nowMinusDays(i.daysAgo),
    category: null,
    author: profiles.get(i.authorId) ?? null,
    rating: null,
    coverUrl: null,
    tags: [],
    openingHours: null,
  }))

  const reviews: Review[] = SEED_REVIEWS.map((r) => ({
    id: r.id,
    placeId: r.placeId,
    authorId: r.authorId,
    rating: r.rating,
    text: r.text,
    visitedAt: nowMinusDays(r.daysAgo).slice(0, 10),
    createdAt: nowMinusDays(r.daysAgo),
    author: profiles.get(r.authorId) ?? null,
  }))

  return { categories: [...SEED_CATEGORIES], places: [...places, ...ideas], reviews, photos: [], votes: [], plans: [], tags: [], placeTags: [] }
}

function read(): Store {
  const raw = localStorage.getItem(STORE_KEY)
  if (!raw) {
    const fresh = seedStore()
    localStorage.setItem(STORE_KEY, JSON.stringify(fresh))
    return fresh
  }
  try {
    return JSON.parse(raw) as Store
  } catch {
    const fresh = seedStore()
    localStorage.setItem(STORE_KEY, JSON.stringify(fresh))
    return fresh
  }
}

function write(store: Store): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

const listeners = new Set<(profile: Profile | null) => void>()

function session(): Profile | null {
  const id = localStorage.getItem(SESSION_KEY)
  if (!id) return null
  const found = SEED_PROFILES.find((p) => p.id === id)
  return found ? { id: found.id, displayName: found.displayName, avatarUrl: found.avatarUrl } : null
}

function notify(): void {
  const profile = session()
  listeners.forEach((fn) => fn(profile))
}

function requireSession(): Profile {
  const profile = session()
  if (!profile) throw new ApiError('Сессия истекла. Войди заново.')
  return profile
}

/** Дозаполняет связи, которые в Postgres пришли бы join-ом. */
function hydrate(place: Place, store: Store): Place {
  const seedProfile = SEED_PROFILES.find((p) => p.id === place.authorId)
  // О-5: средняя оценка не хранится, а считается — как в supabase-адаптере,
  // где она выводится из вложенных `reviews(rating)`.
  const ratings = (store.reviews ?? []).filter((r) => r.placeId === place.id)

  const cover = (store.photos ?? [])
    .filter((photo) => photo.placeId === place.id)
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]

  return {
    ...place,
    category: store.categories.find((c) => c.id === place.categoryId) ?? null,
    author: seedProfile ? { id: seedProfile.id, displayName: seedProfile.displayName, avatarUrl: seedProfile.avatarUrl } : null,
    rating: ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null,
    coverUrl: cover?.url ?? null,
    tags: (store.placeTags ?? [])
      .filter((link) => link.placeId === place.id)
      .flatMap((link) => (store.tags ?? []).filter((tag) => tag.id === link.tagId)),
  }
}

function applyInput(place: Place, input: PlaceInput): Place {
  return {
    ...place,
    title: input.title,
    categoryId: input.categoryId,
    description: input.description,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    sourceUrl: input.sourceUrl,
    sourceTitle: input.sourceTitle,
    price: input.price,
    isIdea: input.isIdea,
    openingHours: input.openingHours ?? place.openingHours,
    updatedAt: new Date().toISOString(),
  }
}

export const localBackend: Backend = {
  kind: 'local',

  auth: {
    async current() {
      return session()
    },

    async signIn(email, password) {
      const found = SEED_PROFILES.find((p) => p.email.toLowerCase() === email.trim().toLowerCase())
      if (!found || password !== LOCAL_PASSWORD) {
        throw new ApiError('Не тот адрес или пароль.')
      }
      localStorage.setItem(SESSION_KEY, found.id)
      notify()
      return { id: found.id, displayName: found.displayName, avatarUrl: found.avatarUrl }
    },

    async signOut() {
      localStorage.removeItem(SESSION_KEY)
      notify()
    },

    subscribe(onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },

    async updateProfile(patch) {
      const me = requireSession()
      const seed = SEED_PROFILES.find((p) => p.id === me.id)
      if (seed) {
        if (patch.displayName !== undefined) seed.displayName = patch.displayName
        if (patch.avatarUrl !== undefined) seed.avatarUrl = patch.avatarUrl
      }
      notify()
      return { ...me, ...patch } as Profile
    },

    async uploadAvatar(blob) {
      requireSession()
      // Настоящего хранилища тут нет — картинка живёт в профиле как data URL.
      return blobToDataUrl(blob)
    },

    async changePassword() {
      throw new ApiError('В демо-режиме пароль не меняется — подключите Supabase.')
    },
  },

  async backup() {
    const store = read()
    return { exportedAt: new Date().toISOString(), source: 'local', ...store }
  },

  categories: {
    async list() {
      return read().categories.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'))
    },

    async create(name, emoji = null) {
      const store = read()
      if (store.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new ApiError('Такая категория уже есть.')
      }
      const category: Category = { id: crypto.randomUUID(), name, emoji, sortOrder: 500 }
      store.categories.push(category)
      write(store)
      return category
    },

    async rename(id, name) {
      const store = read()
      const category = store.categories.find((c) => c.id === id)
      if (!category) throw new ApiError('Категория не найдена.')
      category.name = name
      write(store)
      return category
    },

    async remove(id) {
      const store = read()
      store.categories = store.categories.filter((c) => c.id !== id)
      // on delete set null, как в схеме
      store.places = store.places.map((p) => (p.categoryId === id ? { ...p, categoryId: null } : p))
      write(store)
    },
  },

  places: {
    async list() {
      const store = read()
      return store.places
        .map((p) => hydrate(p, store))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async get(id) {
      const store = read()
      const place = store.places.find((p) => p.id === id)
      return place ? hydrate(place, store) : null
    },

    async create(input) {
      const me = requireSession()
      const store = read()
      const timestamp = new Date().toISOString()
      const place: Place = {
        id: crypto.randomUUID(),
        title: input.title,
        categoryId: input.categoryId,
        status: 'want',
        isIdea: input.isIdea,
        description: input.description,
        address: input.address,
        lat: input.lat,
        lng: input.lng,
        sourceUrl: input.sourceUrl,
        sourceTitle: input.sourceTitle,
        price: input.price,
        authorId: me.id,
        createdAt: timestamp,
        updatedAt: timestamp,
        category: null,
        author: me,
        rating: null,
        coverUrl: null,
        tags: [],
        openingHours: input.openingHours ?? null,
      }
      store.places.push(place)
      write(store)
      return hydrate(place, store)
    },

    async update(id, input) {
      const me = requireSession()
      const store = read()
      const index = store.places.findIndex((p) => p.id === id)
      if (index < 0) throw new ApiError('Место не найдено.')
      if (store.places[index].authorId !== me.id) throw new ApiError('Править может только автор.')
      store.places[index] = applyInput(store.places[index], input)
      write(store)
      return hydrate(store.places[index], store)
    },

    async remove(id) {
      const me = requireSession()
      const store = read()
      const place = store.places.find((p) => p.id === id)
      if (!place) return
      if (place.authorId !== me.id) throw new ApiError('Удалить может только автор.')
      store.places = store.places.filter((p) => p.id !== id)
      write(store)
    },

    async setStatus(id, status: PlaceStatus) {
      requireSession()
      const store = read()
      const place = store.places.find((p) => p.id === id)
      if (!place) throw new ApiError('Место не найдено.')
      place.status = status
      place.updatedAt = new Date().toISOString()
      write(store)
    },
  },

  reviews: {
    async listForPlace(placeId) {
      const store = read()
      return (store.reviews ?? [])
        .filter((r) => r.placeId === placeId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },

    async listAll() {
      return (read().reviews ?? []).slice().sort((a, b) => (b.visitedAt ?? '').localeCompare(a.visitedAt ?? ''))
    },

    async save(placeId, input: ReviewInput) {
      const me = requireSession()
      const store = read()
      store.reviews = store.reviews ?? []

      // О-1: один отзыв на место от пользователя. В Postgres это `unique`,
      // здесь — поиск существующего перед вставкой.
      const existing = store.reviews.find((r) => r.placeId === placeId && r.authorId === me.id)
      const review: Review = existing
        ? { ...existing, rating: input.rating, text: input.text, visitedAt: input.visitedAt }
        : {
            id: crypto.randomUUID(),
            placeId,
            authorId: me.id,
            rating: input.rating,
            text: input.text,
            visitedAt: input.visitedAt,
            createdAt: new Date().toISOString(),
            author: me,
          }

      store.reviews = existing ? store.reviews.map((r) => (r.id === existing.id ? review : r)) : [...store.reviews, review]
      write(store)
      return review
    },

    async remove(id) {
      const me = requireSession()
      const store = read()
      const review = (store.reviews ?? []).find((r) => r.id === id)
      if (!review) return
      if (review.authorId !== me.id) throw new ApiError('Удалить можно только свой отзыв.')
      store.reviews = store.reviews.filter((r) => r.id !== id)
      write(store)
    },
  },

  tags: {
    async list() {
      return (read().tags ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    },

    async setForPlace(placeId, names) {
      requireSession()
      const store = read()
      store.tags = store.tags ?? []
      store.placeTags = store.placeTags ?? []

      const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))]
      const resolved = clean.map((name) => {
        const existing = store.tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase())
        if (existing) return existing
        const created: Tag = { id: crypto.randomUUID(), name }
        store.tags.push(created)
        return created
      })

      store.placeTags = store.placeTags
        .filter((link) => link.placeId !== placeId)
        .concat(resolved.map((tag) => ({ placeId, tagId: tag.id })))

      write(store)
      return resolved
    },
  },

  plans: {
    async list() {
      const store = read()
      return (store.plans ?? [])
        .map((plan) => {
          const place = store.places.find((p) => p.id === plan.placeId)
          return { ...plan, place: place ? hydrate(place, store) : null }
        })
        .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || (a.plannedTime ?? '').localeCompare(b.plannedTime ?? ''))
    },

    async create(input: PlanInput) {
      const me = requireSession()
      const store = read()
      store.plans = store.plans ?? []
      const plan: Plan = { id: crypto.randomUUID(), ...input, createdBy: me.id, place: null }
      store.plans.push(plan)
      write(store)
      const place = store.places.find((p) => p.id === input.placeId)
      return { ...plan, place: place ? hydrate(place, store) : null }
    },

    async update(id, input: PlanInput) {
      requireSession()
      const store = read()
      const index = (store.plans ?? []).findIndex((plan) => plan.id === id)
      if (index < 0) throw new ApiError('План не найден.')
      store.plans[index] = { ...store.plans[index], ...input }
      write(store)
      const place = store.places.find((p) => p.id === input.placeId)
      return { ...store.plans[index], place: place ? hydrate(place, store) : null }
    },

    async remove(id) {
      const me = requireSession()
      const store = read()
      const plan = (store.plans ?? []).find((p) => p.id === id)
      if (!plan) return
      if (plan.createdBy !== me.id) throw new ApiError('Удалить может только тот, кто запланировал.')
      store.plans = store.plans.filter((p) => p.id !== id)
      write(store)
    },
  },

  votes: {
    async list() {
      return read().votes ?? []
    },

    async cast(placeId, wants) {
      const me = requireSession()
      const store = read()
      store.votes = store.votes ?? []

      const vote: Vote = { placeId, userId: me.id, wants }
      const existing = store.votes.findIndex((v) => v.placeId === placeId && v.userId === me.id)
      if (existing >= 0) store.votes[existing] = vote
      else store.votes.push(vote)

      write(store)
      return vote
    },
  },

  photos: {
    async listForPlace(placeId) {
      const store = read()
      const reviewIds = new Set((store.reviews ?? []).filter((r) => r.placeId === placeId).map((r) => r.id))
      return (store.photos ?? [])
        .filter((photo) => photo.placeId === placeId || (photo.reviewId && reviewIds.has(photo.reviewId)))
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async upload(target: PhotoTarget, blob, size) {
      const me = requireSession()
      const store = read()
      store.photos = store.photos ?? []

      // Настоящего хранилища тут нет: файл живёт в localStorage как data URL.
      // Для демо этого хватает, но квота браузера — около 5 МБ на всё,
      // поэтому падение по переполнению обрабатываем понятным текстом.
      const url = await blobToDataUrl(blob)

      const photo: Photo = {
        id: crypto.randomUUID(),
        placeId: target.placeId ?? null,
        reviewId: target.reviewId ?? null,
        storageKey: `local/${crypto.randomUUID()}`,
        url,
        width: size.width,
        height: size.height,
        sortOrder: store.photos.filter((p) => p.placeId === (target.placeId ?? null)).length,
        uploadedBy: me.id,
      }

      store.photos.push(photo)
      try {
        write(store)
      } catch {
        throw new ApiError('В демо-режиме место под фото кончилось — браузер даёт около 5 МБ. Подключите Supabase.')
      }
      return photo
    },

    async remove(id) {
      const me = requireSession()
      const store = read()
      const photo = (store.photos ?? []).find((p) => p.id === id)
      if (!photo) return
      if (photo.uploadedBy !== me.id) throw new ApiError('Удалить можно только своё фото.')
      store.photos = store.photos.filter((p) => p.id !== id)
      write(store)
    },

    async usage() {
      const photos = read().photos ?? []
      // data URL в base64 весит примерно на треть больше самого файла.
      const bytes = photos.reduce((sum, photo) => sum + Math.round((photo.url.length * 3) / 4), 0)
      return { files: photos.length, bytes }
    },
  },
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError('Не смогли прочитать файл'))
    reader.readAsDataURL(blob)
  })
}

/** Сброс демо-данных к исходному состоянию. Вызывается из настроек. */
export function resetLocalStore(): void {
  localStorage.removeItem(STORE_KEY)
}
