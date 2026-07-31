import { useSyncExternalStore } from 'react'

// С-2: переход на десктоп — 900px. Значение дублирует `--breakpoint-desktop`
// из theme.css: в JS медиазапрос приходится задавать числом.
const QUERY = '(min-width: 900px)'

const media = typeof window === 'undefined' ? null : window.matchMedia(QUERY)

function subscribe(onChange: () => void): () => void {
  media?.addEventListener('change', onChange)
  return () => media?.removeEventListener('change', onChange)
}

/**
 * Мобильный и десктопный макеты в прототипе устроены по-разному: сетка против
 * полок, инлайн-панель фильтров против нижней шторки, две колонки против одной.
 * Отрисовать оба и спрятать один через `hidden` — значит удвоить DOM и оставить
 * скринридеру две копии ленты. Поэтому выбираем один и рендерим только его.
 */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => media?.matches ?? false,
    () => false, // на сервере считаем мобильным: он же и дефолт вёрстки
  )
}
