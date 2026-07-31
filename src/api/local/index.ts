import type { Category, Place, PlaceInput, PlaceStatus, Profile } from '@/types/models'

import { ApiError, type Backend } from '../backend'
import { LOCAL_PASSWORD, SEED_CATEGORIES, SEED_IDEAS, SEED_PLACES, SEED_PROFILES } from './seed'

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
  }))

  return { categories: [...SEED_CATEGORIES], places: [...places, ...ideas] }
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
  return {
    ...place,
    category: store.categories.find((c) => c.id === place.categoryId) ?? null,
    author: seedProfile ? { id: seedProfile.id, displayName: seedProfile.displayName, avatarUrl: seedProfile.avatarUrl } : null,
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
}

/** Сброс демо-данных к исходному состоянию. Вызывается из настроек. */
export function resetLocalStore(): void {
  localStorage.removeItem(STORE_KEY)
}
