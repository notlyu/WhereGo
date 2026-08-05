import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/Button'
import { useFeedData } from '@/features/feed/useFeedData'
import { useAuth } from '@/hooks/auth-context'
import { useDeletePlan, usePlans } from '@/hooks/queries'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { formatDate } from '@/lib/format'
import type { Plan } from '@/types/models'

import { buildMonth, dateKey, monthTitle, plansForDay } from './calendar'
import { PlanForm } from './PlanForm'

const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

/** В-3, В-4: календарь месяца, список на день и форма плана. */
export function PlansPage() {
  const isDesktop = useIsDesktop()
  const { profile } = useAuth()
  const { list } = useFeedData()
  const { data: plans = [], isPending } = usePlans()
  const remove = useDeletePlan()

  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => dateKey(new Date()))
  const [editing, setEditing] = useState<Plan | null | undefined>(undefined)

  const days = useMemo(() => buildMonth(anchor, plans), [anchor, plans])
  const dayPlans = useMemo(() => plansForDay(plans, selected), [plans, selected])

  function shiftMonth(delta: number) {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
  }

  async function onDelete(plan: Plan) {
    if (!confirm(`Убрать план на ${formatDate(plan.plannedDate)}?`)) return
    await remove.mutateAsync(plan.id)
  }

  const calendar = (
    <div className={cn('rounded-[20px] p-[18px]', isDesktop ? 'bg-surface-d' : 'bg-surface-2')}>
      <div className="mb-3.5 flex items-center gap-2">
        <div className="flex-1 eyebrow">{monthTitle(anchor)}</div>
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Предыдущий месяц"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-pill bg-surface-3 text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Следующий месяц"
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-pill bg-surface-3 text-fg-muted transition-colors hover:text-fg"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1 text-center text-[11px] text-fg-dimmer">
        {WEEKDAYS.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            // Форму при смене дня не закрываем: выбор числа — часть заполнения,
            // а не отмена. Раньше тап по другому числу стирал начатый план,
            // и дату приходилось угадывать до нажатия «+».
            onClick={() => setSelected(day.date)}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[13px] transition-colors',
              day.date === selected ? 'bg-accent font-bold text-on-accent' : 'hover:bg-surface-3',
              day.date !== selected && day.outside && 'text-fg-dimmer',
              day.date !== selected && !day.outside && 'text-fg',
              day.today && day.date !== selected && 'font-bold text-accent',
            )}
          >
            <span>{day.n}</span>
            {/* В-3: точка под числом — на день что-то запланировано. */}
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                day.plans > 0 ? (day.date === selected ? 'bg-on-accent' : 'bg-accent') : 'bg-transparent',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )

  const dayList = (
    <>
      <div className="mt-5 flex items-center gap-2.5">
        <div className="flex-1 eyebrow">{formatDate(selected)}</div>
        <Button
          size="md"
          onClick={() => setEditing(null)}
          className="h-9 px-4 text-[13px]"
          disabled={list.length === 0}
        >
          <Plus size={15} />
          План
        </Button>
      </div>

      {editing !== undefined ? (
        <div className="mt-3.5">
          <PlanForm
            // Ключ разделяет «новый план» и правку конкретного плана. Без него
            // форма остаётся той же и держит прежние значения: нажали «+»,
            // потом карандаш — и в полях висит недописанный новый план.
            key={editing?.id ?? 'new'}
            plan={editing}
            date={selected}
            places={list}
            desktop={isDesktop}
            onDone={() => setEditing(undefined)}
          />
        </div>
      ) : null}

      <div className="mt-3.5 flex flex-col gap-3">
        {dayPlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            mine={plan.createdBy === profile?.id}
            desktop={isDesktop}
            onEdit={() => setEditing(plan)}
            onDelete={() => void onDelete(plan)}
          />
        ))}

        {dayPlans.length === 0 && editing === undefined ? (
          <div className="text-sm text-fg-dim">
            {list.length === 0 ? 'Сначала добавьте место — планировать пока нечего.' : 'На этот день ничего не запланировано.'}
          </div>
        ) : null}
      </div>
    </>
  )

  if (isPending) {
    return <div className={cn('animate-pulse rounded-[20px] bg-surface-2', isDesktop ? 'h-[420px] max-w-[420px]' : 'mx-5 h-[420px]')} />
  }

  if (isDesktop) {
    return (
      <div>
        <header>
          <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-muted uppercase">
            планов впереди · {plans.filter((plan) => plan.plannedDate >= dateKey(new Date())).length}
          </div>
          <h1 className="mt-2 font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">Планы</h1>
        </header>

        <div className="mt-6 grid items-start gap-6 grid-cols-[minmax(300px,380px)_minmax(360px,1fr)]">
          <div>{calendar}</div>
          <div>{dayList}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 pt-3.5 pb-8">
      <h1 className="mb-5 font-display text-[30px] font-medium tracking-[-.02em] text-fg">Планы</h1>
      {calendar}
      {dayList}
    </div>
  )
}

function PlanCard({
  plan,
  mine,
  desktop,
  onEdit,
  onDelete,
}: {
  plan: Plan
  mine: boolean
  desktop: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn('animate-pop rounded-[18px] px-[18px] py-4', desktop ? 'bg-surface-d' : 'bg-surface-2')}>
      <div className="flex items-center gap-2.5">
        <div className="min-w-0 flex-1 truncate text-base font-semibold text-fg">
          {plan.place?.title ?? 'Место удалили'}
        </div>
        {plan.plannedTime ? <div className="flex-none text-sm font-bold text-accent">{plan.plannedTime}</div> : null}

        {mine ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label="Изменить план"
              className="flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-3 text-fg-muted transition-colors hover:text-accent"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Убрать план"
              className="flex h-[34px] w-[34px] flex-none cursor-pointer items-center justify-center rounded-pill bg-surface-3 text-fg-muted transition-colors hover:text-[#FF7A6B]"
            >
              <Trash2 size={12} />
            </button>
          </>
        ) : null}
      </div>

      {plan.note ? <div className="mt-2 text-[13px] leading-[1.5] text-fg-muted">{plan.note}</div> : null}

      {plan.place ? (
        <Link
          to={`/place/${plan.place.id}`}
          className={cn(
            'mt-3 flex items-center gap-3 rounded-[14px] px-3 py-2.5 transition-colors',
            desktop ? 'bg-well hover:bg-surface-2' : 'bg-surface-1 hover:bg-surface-3',
          )}
        >
          {plan.place.coverUrl ? (
            <img src={plan.place.coverUrl} alt="" className="h-10 w-10 flex-none rounded-[10px] object-cover" />
          ) : (
            <div className="hatch-sm h-10 w-10 flex-none rounded-[10px]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] text-fg-muted">{plan.place.category?.name ?? 'без категории'}</div>
            <div className="mt-0.5 truncate text-xs text-fg-dimmer">{plan.place.address ?? 'без адреса'}</div>
          </div>
          <div className="flex-none text-[12.5px] font-semibold text-accent">о месте →</div>
        </Link>
      ) : null}
    </div>
  )
}
