import type { Place } from '@/types/models'

/**
 * «ХОЧЕТ LY» / «ХОЧУ Я» — надпись под названием места.
 *
 * До Этапа 4 голосов нет, поэтому «кто хочет» выводится из автора места со
 * статусом `want` — ровно как в прототипе. Когда появится `place_votes` (В-2),
 * сюда добавится вариант «ХОТИМ ОБА».
 */
export function WantLabel({ place, meId }: { place: Place; meId: string | null }) {
  if (place.status !== 'want' || !place.author) return null

  const mine = place.author.id === meId
  const text = mine ? 'хочу я' : `хочет ${place.author.displayName}`

  return <div className="text-[11px] font-semibold tracking-[.1em] whitespace-nowrap text-fg-dim uppercase">{text}</div>
}
