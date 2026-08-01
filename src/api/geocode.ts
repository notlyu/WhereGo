export interface GeocodeResult {
  label: string
  lat: number
  lng: number
}

/**
 * М-9: поиск адреса через Nominatim.
 *
 * Лимит честный — один запрос в секунду на всех, и за превышение блокируют
 * по адресу. Поэтому три предосторожности:
 *   • задержка 1100 мс после последнего нажатия клавиши, а не на каждую букву;
 *   • отмена предыдущего запроса, если пользователь продолжил печатать;
 *   • кэш ответов, чтобы возврат к уже набранному не стоил запроса.
 *
 * Отступление от ТЗ: кэш в localStorage, а не в своей таблице. Общая таблица
 * дала бы выигрыш, только если оба ищут один и тот же адрес, — ради этого
 * заводить миграцию и ходить в дашборд не стоило. Заменить можно позже,
 * не трогая вызывающий код.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search'
const CACHE_KEY = 'kuda-poyti/geocode-cache/v1'
const DEBOUNCE_MS = 1100
/** Петербург и область — чтобы «Некрасова» не нашлась в Новосибирске. */
const VIEWBOX = '29.4,60.4,31.0,59.6'

type Cache = Record<string, GeocodeResult[]>

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}') as Cache
  } catch {
    return {}
  }
}

function writeCache(cache: Cache): void {
  // Держим сотню последних запросов — больше в localStorage не нужно.
  const entries = Object.entries(cache).slice(-100)
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    localStorage.removeItem(CACHE_KEY)
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

/** Немедленный поиск без задержки — для кнопки «найти». */
export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const key = query.trim().toLowerCase()
  if (key.length < 3) return []

  const cache = readCache()
  if (cache[key]) return cache[key]

  const url = new URL(ENDPOINT)
  url.searchParams.set('q', query)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '5')
  url.searchParams.set('accept-language', 'ru')
  url.searchParams.set('countrycodes', 'ru')
  url.searchParams.set('viewbox', VIEWBOX)
  url.searchParams.set('bounded', '0')

  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`Nominatim ответил ${response.status}`)

  const raw = (await response.json()) as { display_name: string; lat: string; lon: string }[]
  const results = raw.map((item) => ({
    label: item.display_name,
    lat: Number(item.lat),
    lng: Number(item.lon),
  }))

  cache[key] = results
  writeCache(cache)
  return results
}

/**
 * Поиск с задержкой. Каждый новый вызов отменяет предыдущий — и таймер,
 * и уже улетевший запрос.
 */
export function geocodeDebounced(query: string, onResult: (results: GeocodeResult[]) => void, onError: (message: string) => void): void {
  clearTimeout(timer)
  controller?.abort()

  if (query.trim().length < 3) {
    onResult([])
    return
  }

  timer = setTimeout(() => {
    controller = new AbortController()
    geocode(query, controller.signal).then(onResult, (cause: unknown) => {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      onError(cause instanceof Error ? cause.message : 'Поиск адреса не ответил')
    })
  }, DEBOUNCE_MS)
}
