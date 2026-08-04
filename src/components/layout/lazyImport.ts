import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** Чтобы перезагрузка не зациклилась, если файла и правда нет. */
const RELOAD_KEY = 'kuda-poyti/chunk-reloaded'

/**
 * Что делать при неудачном импорте: перезагрузиться или сдаться.
 *
 * Вынесено отдельно и без побочных эффектов — иначе не проверить, что
 * повторная неудача не уводит страницу в бесконечную перезагрузку.
 */
export function planChunkRecovery(storage: Pick<Storage, 'getItem' | 'setItem'>): 'reload' | 'give-up' {
  if (storage.getItem(RELOAD_KEY)) return 'give-up'
  storage.setItem(RELOAD_KEY, '1')
  return 'reload'
}

/**
 * Ленивый маршрут, переживающий выкладку новой версии.
 *
 * Имена файлов содержат хеш содержимого, поэтому после каждой сборки они
 * меняются. Вкладка, открытая до выкладки, продолжает просить старый файл —
 * а его уже нет. SPA-заглушка Cloudflare на любой неизвестный путь отдаёт
 * `index.html` с кодом 200, браузер получает HTML вместо кода, и `import()`
 * падает с «error loading dynamically imported module».
 *
 * Лечение: один раз перезагрузить страницу. Тогда придёт свежий index.html
 * с новыми именами, и переход состоится. Флаг в sessionStorage не даёт уйти
 * в петлю, если файл отсутствует по-настоящему.
 */
export function lazyImport<M extends object, K extends keyof M>(
  load: () => Promise<M>,
  name: K,
): LazyExoticComponent<M[K] extends ComponentType<infer P> ? ComponentType<P> : never> {
  const component = lazy(async () => {
    try {
      const module = await load()
      sessionStorage.removeItem(RELOAD_KEY)
      // Один раз приводим тип: что `module[name]` — компонент, знает вызывающий,
      // а возвращаемый тип восстанавливает его пропсы обратно.
      return { default: module[name] as ComponentType<unknown> }
    } catch (cause) {
      if (planChunkRecovery(sessionStorage) === 'reload') {
        window.location.reload()
        // Промис не разрешаем: страница уже перезагружается, показывать
        // ошибку на полсекунды незачем.
        return new Promise<never>(() => {})
      }
      throw cause
    }
  })

  return component as never
}
