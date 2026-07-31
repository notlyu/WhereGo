import { Outlet } from 'react-router'

import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

/**
 * С-2: одна оболочка на две точки останова.
 *
 * До 900px — плавающая пилюля снизу, отступ контента `padding:0 20px 128px`
 * из мобильного макета. От 900px — панель 252px слева и `34px 40px 60px`
 * из десктопного.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 pb-[calc(128px+env(safe-area-inset-bottom))] desktop:max-w-[1400px] desktop:px-10 desktop:pt-[34px] desktop:pb-15">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
