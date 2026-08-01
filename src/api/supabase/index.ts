import type { Database } from '@/types/database'
import type { Category, Place, PlaceInput, PlaceStatus, Profile } from '@/types/models'

import { ApiError, type Backend } from '../backend'
import { supabase } from './client'

type PlaceRow = Database['public']['Tables']['places']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

type PlaceRowJoined = PlaceRow & {
  category: CategoryRow | null
  author: ProfileRow | null
  reviews: { rating: number }[] | null
  photos: { url: string; sort_order: number }[] | null
}

// Один запрос вместо четырёх: PostgREST разворачивает связи по внешним ключам.
//
// Связь указывается через `!имя_ограничения` явно, а не выводится сама.
// Между `places` и `profiles` путей несколько: прямой `author_id`, плюс
// `reviews` и `place_votes` — обе ссылаются и на место, и на человека, и
// PostgREST видит в них связь «многие ко многим». Без подсказки он отвечает
// «more than one relationship was found» и запрос не выполняется вовсе.
//
// Имена — те, что Postgres выдаёт по умолчанию: <таблица>_<колонка>_fkey.
// Если миграцию правили руками, свериться можно так:
//   select conname from pg_constraint
//   where conrelid in ('places'::regclass, 'reviews'::regclass, 'photos'::regclass)
//     and contype = 'f';
const PLACE_SELECT = `
  *,
  category:categories!places_category_id_fkey(*),
  author:profiles!places_author_id_fkey(*),
  reviews!reviews_place_id_fkey(rating),
  photos!photos_place_id_fkey(url, sort_order)
`

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, avatarUrl: row.avatar_url }
}

function toCategory(row: CategoryRow): Category {
  return { id: row.id, name: row.name, emoji: row.emoji, sortOrder: row.sort_order }
}

function toPlace(row: PlaceRowJoined): Place {
  const ratings = row.reviews ?? []
  const photos = [...(row.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)

  return {
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    status: row.status,
    isIdea: row.is_idea,
    description: row.description,
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    sourceUrl: row.source_url,
    sourceTitle: row.source_title,
    price: row.price,
    authorId: row.author_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category ? toCategory(row.category) : null,
    author: row.author ? toProfile(row.author) : null,
    rating: ratings.length ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : null,
    coverUrl: photos[0]?.url ?? null,
  }
}

function toRow(input: PlaceInput) {
  return {
    title: input.title,
    category_id: input.categoryId,
    description: input.description,
    address: input.address,
    lat: input.lat,
    lng: input.lng,
    source_url: input.sourceUrl,
    source_title: input.sourceTitle,
    price: input.price,
    is_idea: input.isIdea,
  }
}

/**
 * Профиль текущего пользователя. Создаётся триггером `on_auth_user_created`
 * при заведении пользователя в дашборде — если его нет, триггер не отработал.
 */
async function currentProfile(): Promise<Profile | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user
  if (!user) return null

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
  if (error) throw new ApiError(error.message)
  if (!data) {
    throw new ApiError('Профиль не найден. Проверь, что триггер on_auth_user_created применён (0001_init.sql).')
  }
  return toProfile(data)
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new ApiError('Сессия истекла. Войди заново.')
  return data.user.id
}

export const supabaseBackend: Backend = {
  kind: 'supabase',

  auth: {
    current: currentProfile,

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        // А-2: регистрация закрыта, так что «нет такого пользователя» — норма,
        // а не повод предлагать зарегистрироваться.
        throw new ApiError(
          error.message === 'Invalid login credentials' ? 'Не тот адрес или пароль.' : error.message,
        )
      }
      const profile = await currentProfile()
      if (!profile) throw new ApiError('Вошли, но профиль не подгрузился.')
      return profile
    },

    async signOut() {
      const { error } = await supabase.auth.signOut()
      if (error) throw new ApiError(error.message)
    },

    subscribe(onChange) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!session) {
          onChange(null)
          return
        }
        void currentProfile().then(onChange, () => onChange(null))
      })
      return () => data.subscription.unsubscribe()
    },
  },

  categories: {
    async list() {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('name')
      if (error) throw new ApiError(error.message)
      return data.map(toCategory)
    },

    async create(name, emoji = null) {
      const createdBy = await requireUserId()
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, emoji, created_by: createdBy, sort_order: 500 })
        .select('*')
        .single()
      if (error) throw new ApiError(error.message)
      return toCategory(data)
    },

    async rename(id, name) {
      const { data, error } = await supabase.from('categories').update({ name }).eq('id', id).select('*').single()
      if (error) throw new ApiError(error.message)
      return toCategory(data)
    },

    async remove(id) {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw new ApiError(error.message)
    },
  },

  places: {
    async list() {
      const { data, error } = await supabase
        .from('places')
        .select(PLACE_SELECT)
        .order('created_at', { ascending: false })
      if (error) throw new ApiError(error.message)
      return (data as unknown as PlaceRowJoined[]).map(toPlace)
    },

    async get(id) {
      const { data, error } = await supabase.from('places').select(PLACE_SELECT).eq('id', id).maybeSingle()
      if (error) throw new ApiError(error.message)
      return data ? toPlace(data as unknown as PlaceRowJoined) : null
    },

    async create(input) {
      const authorId = await requireUserId()
      const { data, error } = await supabase
        .from('places')
        .insert({ ...toRow(input), author_id: authorId })
        .select(PLACE_SELECT)
        .single()
      if (error) throw new ApiError(error.message)
      return toPlace(data as unknown as PlaceRowJoined)
    },

    async update(id, input) {
      // М-3: правит только автор. Ограничение держит RLS, не интерфейс.
      const { data, error } = await supabase
        .from('places')
        .update(toRow(input))
        .eq('id', id)
        .select(PLACE_SELECT)
        .single()
      if (error) throw new ApiError(error.message)
      return toPlace(data as unknown as PlaceRowJoined)
    },

    async remove(id) {
      const { error } = await supabase.from('places').delete().eq('id', id)
      if (error) throw new ApiError(error.message)
    },

    async setStatus(id, status: PlaceStatus) {
      // М-5: не update, а функция с security definer — общая политика
      // «правит только автор» иначе не даст сменить статус чужому месту.
      const { error } = await supabase.rpc('set_place_status', { p_place_id: id, p_status: status })
      if (error) throw new ApiError(error.message)
    },
  },
}
