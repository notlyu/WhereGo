// Единственная точка входа в данные для всего приложения.
//
// Правило изоляции (Architecture.md): вне `src/api/` нет ни одного вызова
// `supabase.*`. Проверяется правилом `no-restricted-imports` в eslint.config.js.

import type { Backend } from './backend'
import { localBackend } from './local'
import { hasSupabaseConfig } from './supabase/client'
import { supabaseBackend } from './supabase'

export { ApiError } from './backend'
export { LOCAL_PASSWORD, SEED_PROFILES } from './local/seed'
export { resetLocalStore } from './local'

/**
 * Пока в окружении нет VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY, приложение
 * работает на локальных данных. Как только ключи появятся в `.env.local`,
 * оно само переключится на боевой бэкенд — менять код не нужно.
 */
export const backend: Backend = hasSupabaseConfig ? supabaseBackend : localBackend

export const auth = backend.auth
export const categories = backend.categories
export const places = backend.places
export const reviews = backend.reviews
export const photos = backend.photos
export const isLocalBackend = backend.kind === 'local'
