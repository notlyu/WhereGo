import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Label, Textarea } from '@/components/ui/Field'
import { useSavePlan } from '@/hooks/queries'
import { cn } from '@/lib/cn'
import type { Place, Plan } from '@/types/models'

interface Props {
  /** null — новый план, объект — правка (В-4). */
  plan: Plan | null
  date: string
  places: Place[]
  desktop: boolean
  onDone: () => void
}

/** В-4: место, дата, время и комментарий. Дата приходит из выбранного дня. */
export function PlanForm({ plan, date, places, desktop, onDone }: Props) {
  const save = useSavePlan()

  const [placeId, setPlaceId] = useState(plan?.placeId ?? places[0]?.id ?? '')
  const [time, setTime] = useState(plan?.plannedTime ?? '')
  const [note, setNote] = useState(plan?.note ?? '')

  const field = cn(
    'h-[54px] w-full rounded-card px-[18px] text-[15px] text-fg outline-none focus:ring-1 focus:ring-border-3',
    desktop ? 'bg-well' : 'bg-surface-1',
  )

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!placeId) return

    save.mutate(
      {
        id: plan?.id,
        input: {
          placeId,
          plannedDate: plan?.plannedDate ?? date,
          // Время необязательно: «сходим в субботу» — тоже план.
          plannedTime: time || null,
          note: note.trim() || null,
        },
      },
      { onSuccess: onDone },
    )
  }

  return (
    <form
      onSubmit={submit}
      className={cn('animate-pop rounded-[18px] p-[18px]', desktop ? 'bg-surface-d' : 'bg-surface-2')}
    >
      <Label>куда идём</Label>
      <select value={placeId} onChange={(event) => setPlaceId(event.target.value)} className={field}>
        {places.map((place) => (
          <option key={place.id} value={place.id}>
            {place.title}
          </option>
        ))}
      </select>

      <div className="mt-4">
        <Label hint="необязательно">во сколько</Label>
        <input type="time" value={time} onChange={(event) => setTime(event.target.value)} className={field} />
      </div>

      <div className="mt-4">
        <Label hint="необязательно">что не забыть</Label>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Бронь на моё имя, столик у окна"
          className={cn('min-h-20', desktop && 'bg-well')}
        />
      </div>

      {save.error ? (
        <div className="mt-3 text-[13px] text-[#FF7A6B]">
          {save.error instanceof Error ? save.error.message : 'Не получилось сохранить план'}
        </div>
      ) : null}

      <div className="mt-4 flex gap-2.5">
        <Button type="submit" size="md" disabled={save.isPending || !placeId} className="flex-1">
          {save.isPending ? 'Сохраняем…' : plan ? 'Сохранить' : 'Запланировать'}
        </Button>
        <Button type="button" size="md" variant="surface" onClick={onDone} className="bg-surface-3 text-fg-muted">
          Отмена
        </Button>
      </div>
    </form>
  )
}
