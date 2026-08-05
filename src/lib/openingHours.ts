/**
 * М-12: часы работы и бейдж «работает».
 *
 * Формат в БД — `jsonb`, как задумано в схеме:
 *   { "mon": [["10:00", "22:00"]], "sat": [["12:00", "02:00"]] }
 *
 * Массив интервалов, а не один: у кафе бывает перерыв, а у бара смена
 * переваливает за полночь. День без ключа или с пустым массивом — выходной.
 */

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type Day = (typeof DAYS)[number]

export const DAY_LABEL: Record<Day, string> = {
  mon: 'пн',
  tue: 'вт',
  wed: 'ср',
  thu: 'чт',
  fri: 'пт',
  sat: 'сб',
  sun: 'вс',
}

export type OpeningHours = Partial<Record<Day, [string, string][]>>

/** Разбирает то, что пришло из БД. Мусор молча считаем отсутствием часов. */
export function parseHours(raw: unknown): OpeningHours | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const result: OpeningHours = {}
  for (const day of DAYS) {
    const value = (raw as Record<string, unknown>)[day]
    if (!Array.isArray(value)) continue

    const ranges = value.filter(
      (range): range is [string, string] =>
        Array.isArray(range) && range.length === 2 && range.every((time) => typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)),
    )
    if (ranges.length) result[day] = ranges
  }

  return Object.keys(result).length ? result : null
}

const minutes = (time: string): number => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))

/**
 * Открыто ли сейчас.
 *
 * Интервал, у которого конец меньше начала, переходит через полночь: бар
 * «22:00–02:00» в час ночи открыт, и это его вчерашняя смена.
 */
export function isOpenNow(hours: OpeningHours | null, now = new Date()): boolean {
  if (!hours) return false

  const today = DAYS[(now.getDay() + 6) % 7]
  const yesterday = DAYS[(now.getDay() + 5) % 7]
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  const openToday = (hours[today] ?? []).some(([from, to]) => {
    const start = minutes(from)
    const end = minutes(to)
    return end > start ? nowMinutes >= start && nowMinutes < end : nowMinutes >= start
  })

  // Вчерашняя смена, перевалившая за полночь.
  const openSinceYesterday = (hours[yesterday] ?? []).some(([from, to]) => {
    const start = minutes(from)
    const end = minutes(to)
    return end <= start && nowMinutes < end
  })

  return openToday || openSinceYesterday
}

/** «10:00–22:00» или «10:00–14:00, 15:00–22:00»; выходной — «закрыто». */
export function formatDay(ranges: [string, string][] | undefined): string {
  if (!ranges?.length) return 'закрыто'
  return ranges.map(([from, to]) => `${from}–${to}`).join(', ')
}

/** Короткая строка для карточки: «сегодня 10:00–22:00». */
export function todayLabel(hours: OpeningHours | null, now = new Date()): string | null {
  if (!hours) return null
  const today = DAYS[(now.getDay() + 6) % 7]
  return `сегодня ${formatDay(hours[today])}`
}
