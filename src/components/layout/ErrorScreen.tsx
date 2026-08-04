import { RotateCw } from 'lucide-react'
import { isRouteErrorResponse, Link, useRouteError } from 'react-router'

/**
 * Экран ошибки вместо стандартного от React Router.
 *
 * Тот показывает английский текст и совет разработчику — на боевом сайте
 * это выглядит как поломка приложения целиком. Здесь то же самое, но
 * по-русски, в тоне приложения и с кнопкой, которая обычно помогает.
 */
export function ErrorScreen() {
  const error = useRouteError()

  const notFound = isRouteErrorResponse(error) && error.status === 404
  const details = describe(error)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-6 text-center">
      <div className="eyebrow">{notFound ? 'страница не нашлась' : 'что-то сломалось'}</div>

      <h1 className="mt-4 max-w-[420px] font-display text-[38px] leading-[1.05] font-medium tracking-[-.02em] text-fg">
        {notFound ? 'Такой страницы нет' : 'Приложение споткнулось'}
      </h1>

      <p className="mt-4 max-w-[380px] text-[15px] leading-relaxed text-fg-muted text-pretty">
        {notFound
          ? 'Ссылка ведёт в никуда. Возможно, место удалили — или адрес набран с опечаткой.'
          : 'Чаще всего помогает перезагрузка: так бывает, когда вкладка была открыта до обновления приложения.'}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-2.5">
        {notFound ? null : (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex h-12 cursor-pointer items-center gap-2 rounded-pill bg-accent px-6 text-[15px] font-bold text-on-accent transition-colors hover:bg-accent-hover"
          >
            <RotateCw size={16} />
            Перезагрузить
          </button>
        )}
        <Link
          to="/"
          className="flex h-12 items-center rounded-pill bg-surface-2 px-6 text-[15px] font-semibold text-fg transition-colors hover:bg-surface-4"
        >
          В ленту
        </Link>
      </div>

      {details ? (
        <details className="mt-8 max-w-[520px] text-left">
          <summary className="cursor-pointer text-[12.5px] text-fg-dimmer">подробности</summary>
          <pre className="mt-2 overflow-x-auto rounded-card bg-surface-1 p-4 text-[11.5px] leading-relaxed text-fg-dim">
            {details}
          </pre>
        </details>
      ) : null}
    </div>
  )
}

function describe(error: unknown): string | null {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return null
}
