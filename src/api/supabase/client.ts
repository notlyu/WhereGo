import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** Настроен ли боевой бэкенд. Проверяется в `src/api/index.ts`. */
export const hasSupabaseConfig = Boolean(url && anonKey)

// Б-1: в бандл попадает только anon key. Service role ключа здесь быть не должно —
// он даёт полный обход RLS, а бандл читается любым, кто открыл сайт.
export const supabase = createClient<Database>(url ?? 'http://localhost', anonKey ?? 'anon', {
  auth: {
    persistSession: true, // А-4: сессия переживает перезапуск
    autoRefreshToken: true,
  },
})
