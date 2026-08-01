import type { Plan } from '@/types/models'

export interface CalendarDay {
  /** YYYY-MM-DD — совпадает с `plans.planned_date`. */
  date: string
  /** Число месяца. */
  n: number
  /** Дни соседних месяцев показываем бледными, но кликабельными. */
  outside: boolean
  today: boolean
  /** В-3: точка под числом, если на день что-то запланировано. */
  plans: number
}

/** Ключ дня без часовых поясов: `toISOString` сдвинул бы дату на UTC. */
export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * В-3: сетка месяца — шесть недель по семь дней, всегда 42 клетки.
 *
 * Недели начинаются с понедельника: в макете подписи «пн … вс», и это
 * привычный для России порядок. Фиксированные 42 клетки нужны, чтобы
 * календарь не прыгал по высоте при переходе между месяцами.
 */
export function buildMonth(anchor: Date, plans: Plan[]): CalendarDay[] {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()

  const counts = new Map<string, number>()
  for (const plan of plans) {
    counts.set(plan.plannedDate, (counts.get(plan.plannedDate) ?? 0) + 1)
  }

  const first = new Date(year, month, 1)
  // getDay(): 0 — воскресенье. Сдвигаем, чтобы неделя начиналась с понедельника.
  const shift = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - shift)
  const todayKey = dateKey(new Date())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)
    const key = dateKey(date)
    return {
      date: key,
      n: date.getDate(),
      outside: date.getMonth() !== month,
      today: key === todayKey,
      plans: counts.get(key) ?? 0,
    }
  })
}

export function plansForDay(plans: Plan[], date: string): Plan[] {
  return plans.filter((plan) => plan.plannedDate === date)
}

/** Ближайший план от сегодня — для подписи в меню профиля. */
export function nextPlan(plans: Plan[]): Plan | null {
  const today = dateKey(new Date())
  return plans.filter((plan) => plan.plannedDate >= today).sort((a, b) => a.plannedDate.localeCompare(b.plannedDate))[0] ?? null
}

const MONTHS = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
]

export function monthTitle(anchor: Date): string {
  return `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
}
