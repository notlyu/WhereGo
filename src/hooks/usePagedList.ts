import { useEffect, useMemo, useState } from 'react'

/** Л-9: лента отдаёт по 20 записей, дальше — по кнопке. */
const PAGE = 20

/**
 * Постраничный показ уже загруженного списка.
 *
 * Мест у двоих будут сотни, не тысячи, поэтому грузим их одним запросом и
 * режем на странице в памяти. Настоящая подгрузка с сервера добавила бы
 * пагинацию в запрос, кэш по страницам и рассинхрон при смене фильтров —
 * ради выигрыша, которого при таком объёме не будет (П-6).
 */
export function usePagedList<T>(items: T[]) {
  const [shown, setShown] = useState(PAGE)

  // Сменились фильтры — начинаем с первой страницы, иначе после сужения
  // выборки кнопка «показать ещё» осталась бы висеть без дела.
  useEffect(() => {
    setShown(PAGE)
  }, [items.length])

  const page = useMemo(() => items.slice(0, shown), [items, shown])

  return {
    page,
    hasMore: items.length > shown,
    rest: items.length - shown,
    showMore: () => setShown((value) => value + PAGE),
  }
}
