import { NavLink } from 'react-router'

import { cn } from '@/lib/cn'

import { TAB_ITEMS } from './nav-items'

/**
 * Мобильная навигация (< 900px): плавающая пилюля с размытием.
 *
 * Вкладки только четыре — как в макете. Остальные разделы лежат списком
 * на экране профиля, см. `PROFILE_MENU`.
 */
export function BottomNav() {
  return (
    // 22px из макета плюс домашняя полоса iPhone: без env() панель на аппаратах
    // с жестовой навигацией наполовину уезжает под неё.
    <nav className="fixed inset-x-5 bottom-[calc(22px+env(safe-area-inset-bottom))] z-30 mx-auto flex h-16 max-w-[420px] rounded-pill bg-surface-2/80 p-1.5 backdrop-blur-xl desktop:hidden">
      {TAB_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-pill transition-colors',
              isActive ? 'text-accent' : 'text-[#7A7A7A] hover:text-fg',
            )
          }
        >
          <Icon size={17} />
          <span className="text-[10.5px] font-semibold tracking-[.02em]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
