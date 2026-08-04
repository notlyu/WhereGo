import type { Database } from '@/types/database'
import type { Category, Photo, Place, PlaceInput, PlaceStatus, Plan, PlanInput, Profile, Review, ReviewInput, Tag } from '@/types/models'

import { ApiError, type Backend, type PhotoTarget } from '../backend'
import { supabase } from './client'

type PlaceRow = Database['public']['Tables']['places']['Row']
type CategoryRow = Database['public']['Tables']['categories']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']
type ReviewRow = Database['public']['Tables']['reviews']['Row']
type PhotoRow = Database['public']['Tables']['photos']['Row']

/** Имя бакета из `0002_storage.sql`. */
const BUCKET = 'photos'

type ReviewRowJoined = ReviewRow & { author: ProfileRow | null }

// Связь указывается явно по той же причине, что и у мест: между `reviews`
// и `profiles` PostgREST видит не один путь.
const REVIEW_SELECT = '*, author:profiles!reviews_author_id_fkey(*)'

type PlaceRowJoined = PlaceRow & {
  category: CategoryRow | null
  author: ProfileRow | null
  reviews: { rating: number }[] | null
  photos: { url: string; sort_order: number }[] | null
  place_tags: { tags: { id: string; name: string } | null }[] | null
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
  photos!photos_place_id_fkey(url, sort_order),
  place_tags!place_tags_place_id_fkey(tags!place_tags_tag_id_fkey(id, name))
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
    tags: (row.place_tags ?? []).flatMap((link) => (link.tags ? [link.tags] : [])),
  }
}

function toReview(row: ReviewRowJoined): Review {
  return {
    id: row.id,
    placeId: row.place_id,
    authorId: row.author_id,
    rating: row.rating,
    text: row.text,
    visitedAt: row.visited_at,
    createdAt: row.created_at,
    author: row.author ? toProfile(row.author) : null,
  }
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    placeId: row.place_id,
    reviewId: row.review_id,
    storageKey: row.r2_key,
    url: row.url,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    uploadedBy: row.uploaded_by,
  }
}

type PlanRowJoined = {
  id: string
  place_id: string
  planned_date: string
  planned_time: string | null
  note: string | null
  created_by: string
  place: PlaceRowJoined | null
}

function toPlan(row: PlanRowJoined): Plan {
  return {
    id: row.id,
    placeId: row.place_id,
    plannedDate: row.planned_date,
    // Postgres отдаёт время как HH:MM:SS — в интерфейсе секунды не нужны.
    plannedTime: row.planned_time ? row.planned_time.slice(0, 5) : null,
    note: row.note,
    createdBy: row.created_by,
    place: row.place ? toPlace(row.place) : null,
  }
}

function toPlanRow(input: PlanInput) {
  return {
    place_id: input.placeId,
    planned_date: input.plannedDate,
    planned_time: input.plannedTime,
    note: input.note,
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

    async updateProfile(patch) {
      const id = await requireUserId()
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...(patch.displayName !== undefined ? { display_name: patch.displayName } : {}),
          ...(patch.avatarUrl !== undefined ? { avatar_url: patch.avatarUrl } : {}),
        })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw new ApiError(error.message)
      return toProfile(data)
    },

    async changePassword(next) {
      const { error } = await supabase.auth.updateUser({ password: next })
      if (error) throw new ApiError(error.message)
    },
  },

  async backup() {
    // Забираем всё, до чего дотягиваются политики чтения. Фото — ссылками:
    // сами файлы лежат в хранилище и в JSON им не место.
    const tables = ['profiles', 'categories', 'places', 'reviews', 'photos', 'tags', 'place_tags', 'plans', 'place_votes'] as const

    const dump: Record<string, unknown> = {
      exportedAt: new Date().toISOString(),
      source: 'supabase',
    }

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*')
      if (error) throw new ApiError(`${table}: ${error.message}`)
      dump[table] = data
    }

    return dump
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

  reviews: {
    async listForPlace(placeId) {
      const { data, error } = await supabase
        .from('reviews')
        .select(REVIEW_SELECT)
        .eq('place_id', placeId)
        .order('created_at')
      if (error) throw new ApiError(error.message)
      return (data as unknown as ReviewRowJoined[]).map(toReview)
    },

    async listAll() {
      const { data, error } = await supabase.from('reviews').select(REVIEW_SELECT).order('visited_at', { ascending: false })
      if (error) throw new ApiError(error.message)
      return (data as unknown as ReviewRowJoined[]).map(toReview)
    },

    async save(placeId, input: ReviewInput) {
      const authorId = await requireUserId()
      // О-1: ограничение `unique (place_id, author_id)` превращает повторную
      // вставку в правку. Без onConflict запрос упал бы с 23505.
      const { data, error } = await supabase
        .from('reviews')
        .upsert(
          {
            place_id: placeId,
            author_id: authorId,
            rating: input.rating,
            text: input.text,
            visited_at: input.visitedAt,
          },
          { onConflict: 'place_id,author_id' },
        )
        .select(REVIEW_SELECT)
        .single()
      if (error) throw new ApiError(error.message)
      return toReview(data as unknown as ReviewRowJoined)
    },

    async remove(id) {
      const { error } = await supabase.from('reviews').delete().eq('id', id)
      if (error) throw new ApiError(error.message)
    },
  },

  tags: {
    async list() {
      const { data, error } = await supabase.from('tags').select('id, name').order('name')
      if (error) throw new ApiError(error.message)
      return data as Tag[]
    },

    async setForPlace(placeId, names) {
      const clean = [...new Set(names.map((name) => name.trim()).filter(Boolean))]

      // Справочник общий и пополняется по ходу: незнакомое название заводится
      // само. `ignoreDuplicates` — чтобы гонка двух человек не роняла запрос.
      if (clean.length > 0) {
        const { error } = await supabase
          .from('tags')
          .upsert(clean.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true } as never)
        if (error) throw new ApiError(error.message)
      }

      const { data: rows, error: findError } = await supabase.from('tags').select('id, name').in('name', clean.length ? clean : [''])
      if (findError) throw new ApiError(findError.message)

      // Набор заменяется целиком: так проще, чем считать разницу, и не оставляет
      // висящих связей, если правку делали с двух устройств сразу.
      const { error: clearError } = await supabase.from('place_tags').delete().eq('place_id', placeId)
      if (clearError) throw new ApiError(clearError.message)

      if (rows.length > 0) {
        const { error: linkError } = await supabase
          .from('place_tags')
          .insert(rows.map((tag) => ({ place_id: placeId, tag_id: tag.id })))
        if (linkError) throw new ApiError(linkError.message)
      }

      return rows as Tag[]
    },
  },

  plans: {
    async list() {
      const { data, error } = await supabase
        .from('plans')
        .select(`*, place:places!plans_place_id_fkey(${PLACE_SELECT})`)
        .order('planned_date')
        .order('planned_time', { nullsFirst: true })
      if (error) throw new ApiError(error.message)

      return (data as unknown as PlanRowJoined[]).map(toPlan)
    },

    async create(input: PlanInput) {
      const createdBy = await requireUserId()
      const { data, error } = await supabase
        .from('plans')
        .insert({ ...toPlanRow(input), created_by: createdBy })
        .select(`*, place:places!plans_place_id_fkey(${PLACE_SELECT})`)
        .single()
      if (error) throw new ApiError(error.message)
      return toPlan(data as unknown as PlanRowJoined)
    },

    async update(id, input: PlanInput) {
      const { data, error } = await supabase
        .from('plans')
        .update(toPlanRow(input))
        .eq('id', id)
        .select(`*, place:places!plans_place_id_fkey(${PLACE_SELECT})`)
        .single()
      if (error) throw new ApiError(error.message)
      return toPlan(data as unknown as PlanRowJoined)
    },

    async remove(id) {
      const { error } = await supabase.from('plans').delete().eq('id', id)
      if (error) throw new ApiError(error.message)
    },
  },

  votes: {
    async list() {
      const { data, error } = await supabase.from('place_votes').select('place_id, user_id, wants')
      if (error) throw new ApiError(error.message)
      return (data as unknown as { place_id: string; user_id: string; wants: boolean }[]).map((row) => ({
        placeId: row.place_id,
        userId: row.user_id,
        wants: row.wants,
      }))
    },

    async cast(placeId, wants) {
      const userId = await requireUserId()
      // Первичный ключ — пара (place_id, user_id): повторный свайп по тому же
      // месту переписывает свой голос, а не заводит второй.
      const { error } = await supabase
        .from('place_votes')
        .upsert({ place_id: placeId, user_id: userId, wants }, { onConflict: 'place_id,user_id' } as never)
      if (error) throw new ApiError(error.message)
      return { placeId, userId, wants }
    },
  },

  photos: {
    async listForPlace(placeId) {
      // Фото отзывов этого места тоже нужны — берём их подзапросом по review_id.
      const { data: reviewRows, error: reviewError } = await supabase
        .from('reviews')
        .select('id')
        .eq('place_id', placeId)
      if (reviewError) throw new ApiError(reviewError.message)

      const reviewIds = reviewRows.map((r) => r.id)
      const filter = reviewIds.length
        ? `place_id.eq.${placeId},review_id.in.(${reviewIds.join(',')})`
        : `place_id.eq.${placeId}`

      const { data, error } = await supabase.from('photos').select('*').or(filter).order('sort_order')
      if (error) throw new ApiError(error.message)
      return data.map(toPhoto)
    },

    async upload(target: PhotoTarget, blob, size) {
      const uploadedBy = await requireUserId()

      // Путь начинается с id пользователя: политики в 0002_storage.sql
      // разрешают запись и удаление только в своей папке.
      const key = `${uploadedBy}/${crypto.randomUUID()}.webp`

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(key, blob, {
        contentType: 'image/webp',
        // Файл неизменяемый: имя содержит UUID, перезаписи не бывает.
        cacheControl: '31536000',
        upsert: false,
      })
      if (uploadError) throw new ApiError(uploadError.message)

      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(key)

      const { data, error } = await supabase
        .from('photos')
        .insert({
          place_id: target.placeId ?? null,
          review_id: target.reviewId ?? null,
          r2_key: key,
          url: publicUrl.publicUrl,
          width: size.width,
          height: size.height,
          bytes: blob.size,
          uploaded_by: uploadedBy,
        } as never)
        .select('*')
        .single()

      if (error) {
        // Запись не легла — файл в хранилище остался бы мусором.
        await supabase.storage.from(BUCKET).remove([key])
        throw new ApiError(error.message)
      }

      return toPhoto(data)
    },

    async remove(id) {
      const { data: row, error: findError } = await supabase.from('photos').select('r2_key').eq('id', id).maybeSingle()
      if (findError) throw new ApiError(findError.message)
      if (!row) return

      // Ф-5: сперва запись, потом файл. Если упадёт удаление файла, запись уже
      // не показывается, а осиротевший объект видно в счётчике занятого места.
      const { error } = await supabase.from('photos').delete().eq('id', id)
      if (error) throw new ApiError(error.message)

      await supabase.storage.from(BUCKET).remove([row.r2_key])
    },

    async usage() {
      const { data, error } = await supabase.from('photos').select('bytes')
      if (error) throw new ApiError(error.message)

      // Колонка `bytes` появляется миграцией 0002. Пока типы не перегенерированы
      // после неё, TypeScript о ней не знает — отсюда приведение.
      const rows = data as unknown as { bytes: number | null }[]
      return {
        files: rows.length,
        bytes: rows.reduce((sum, row) => sum + (row.bytes ?? 0), 0),
      }
    },
  },
}
