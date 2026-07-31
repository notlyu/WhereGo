import { CalendarClock, Compass, LayoutList, Lightbulb, MapPin, PieChart, Sparkles, User } from 'lucide-react'
import type { ComponentType } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
}

/** Боковая панель десктопа (≥ 900px) — порядок из прототипа. */
export const SIDEBAR_ITEMS: NavItem[] = [
  { to: '/', label: 'Лента', icon: LayoutList },
  { to: '/map', label: 'Карта', icon: Compass },
  { to: '/swipe', label: 'Свайпы', icon: Sparkles },
  { to: '/plans', label: 'Планы', icon: CalendarClock },
  { to: '/history', label: 'Мы были тут', icon: MapPin },
  { to: '/year', label: 'Итоги года', icon: PieChart },
  { to: '/ideas', label: 'Идеи', icon: Lightbulb },
]

/** Нижняя панель телефона (< 900px) — ровно четыре вкладки, как в макете. */
export const TAB_ITEMS: NavItem[] = [
  { to: '/', label: 'Лента', icon: LayoutList },
  { to: '/map', label: 'Карта', icon: Compass },
  { to: '/swipe', label: 'Свайпы', icon: Sparkles },
  { to: '/profile', label: 'Профиль', icon: User },
]

/**
 * Разделы, которые на телефоне не поместились в четыре вкладки.
 *
 * В прототипе они лежат списком на экране профиля — иначе с телефона до планов,
 * истории и итогов года просто не добраться.
 */
export const PROFILE_MENU: { to: string; title: string }[] = [
  { to: '/plans', title: 'Планы' },
  { to: '/history', title: 'Мы были тут' },
  { to: '/year', title: 'Итоги года' },
  { to: '/ideas', title: 'Идеи без адреса' },
]
