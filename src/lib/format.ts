import { format, formatDistanceToNowStrict, isThisYear, parseISO } from 'date-fns'
// Точечный импорт локали: `date-fns/locale` — бочка на сотню языков,
// и tree-shaking её не всегда разбирает.
import { ru } from 'date-fns/locale/ru'

/** «12 июля» или «12 июля 2025» — год добавляется только если он не текущий. */
export function formatDate(iso: string): string {
  const date = parseISO(iso)
  return format(date, isThisYear(date) ? 'd MMMM' : 'd MMMM yyyy', { locale: ru })
}

/** «3 дня назад» — для строки «добавил: Ly · 3 дня назад». */
export function formatAgo(iso: string): string {
  return formatDistanceToNowStrict(parseISO(iso), { locale: ru, addSuffix: true })
}

/** «★ 4.5» — рейтинг с одним знаком; null означает «ещё не были». */
export function formatRating(rating: number | null): string {
  return rating === null ? '' : `★ ${rating.toFixed(1).replace('.', ',')}`
}

/** Инициалы для аватара-заглушки: «Ly» → «Ly», «Аня Иванова» → «АИ». */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2)
}

/** «2,4 км» или «840 м». */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(1).replace('.', ',')} км`
}
