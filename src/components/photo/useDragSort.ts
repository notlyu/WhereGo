import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

/**
 * Ф-9: перетаскивание плиток мышью и пальцем, без библиотеки.
 *
 * Готовые решения (dnd-kit и родня) весят 30–40 КБ gzip. При бюджете в
 * 250 КБ, из которых карта уже съела почти всё, это дорого ради экрана,
 * куда заходят раз в месяц.
 *
 * Перетаскивание начинается с ручки, а не с самой плитки. Иначе на телефоне
 * пришлось бы запретить прокрутку на всей сетке: жест «веду пальцем вверх»
 * ничем не отличается от «тащу плитку», и страница переставала бы
 * прокручиваться в том месте, где фотографий больше всего.
 */
export function useDragSort({
  count,
  onMove,
  onCommit,
}: {
  count: number
  /** Переставить элемент. Вызывается много раз за одно перетаскивание. */
  onMove: (from: number, to: number) => void
  /** Палец отпущен — можно сохранять. Не вызывается, если порядок не менялся. */
  onCommit?: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<number | null>(null)
  // Индекс живёт и в ref: обработчики движения создаются один раз.
  const current = useRef<number | null>(null)
  const moved = useRef(false)

  const finish = useCallback(() => {
    if (current.current === null) return
    if (moved.current) onCommit?.()
    current.current = null
    moved.current = false
    setDragging(null)
  }, [onCommit])

  /**
   * Страховка на случай, если палец отпустили не над ручкой.
   *
   * Так бывает не только от неловкости: перестановка перерисовывает сетку, и
   * ручка, с которой начали, может к этому моменту уже не существовать.
   * Тогда её `pointerup` не придёт никогда, и плитка осталась бы подсвеченной
   * до перезагрузки страницы.
   */
  const watchWindow = useCallback(() => {
    const off = () => {
      finish()
      window.removeEventListener('pointerup', off)
      window.removeEventListener('pointercancel', off)
    }
    window.addEventListener('pointerup', off)
    window.addEventListener('pointercancel', off)
  }, [finish])

  const onPointerMove = useCallback(
    (event: ReactPointerEvent) => {
      const from = current.current
      if (from === null || !containerRef.current) return

      // Ищем плитку под пальцем по её месту на экране. `elementFromPoint`
      // тут не годится: под пальцем всегда сама перетаскиваемая плитка.
      const tiles = [...containerRef.current.querySelectorAll('[data-sort-index]')]
      const over = tiles.findIndex((tile) => {
        const r = tile.getBoundingClientRect()
        return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom
      })

      if (over === -1 || over === from) return
      onMove(from, over)
      current.current = over
      moved.current = true
      setDragging(over)
    },
    [onMove],
  )

  /** Ручка плитки: с неё начинается перетаскивание. */
  const handleProps = useCallback(
    (index: number) => ({
      onPointerDown: (event: ReactPointerEvent) => {
        // Только основная кнопка мыши и одиночное касание.
        if (event.button !== 0) return
        event.preventDefault()
        // Захват удерживает события на ручке, даже если палец ушёл за её
        // пределы, — а он всегда уходит. Отказ захвата не повод ломать
        // перетаскивание: без него оно просто менее плавное.
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // никакого действия — работаем без захвата
        }
        current.current = index
        moved.current = false
        setDragging(index)
        watchWindow()
      },
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      // Прокрутка страницы отключена только на самой ручке — 28 пикселей
      // в углу плитки, всё остальное листается как обычно.
      style: { touchAction: 'none' as const },
    }),
    [finish, onPointerMove, watchWindow],
  )

  /**
   * Стрелками — то же самое с клавиатуры. Ручка получает фокус, влево-вправо
   * двигают плитку. Перетаскивание мышью не оставляет способа сделать это
   * без мыши, а «сделать главным» — не то действие, которое можно потерять.
   */
  const keyProps = useCallback(
    (index: number) => ({
      onKeyDown: (event: { key: string; preventDefault: () => void }) => {
        const to = event.key === 'ArrowLeft' ? index - 1 : event.key === 'ArrowRight' ? index + 1 : null
        if (to === null || to < 0 || to >= count) return
        event.preventDefault()
        onMove(index, to)
        onCommit?.()
      },
    }),
    [count, onCommit, onMove],
  )

  return { containerRef, dragging, handleProps, keyProps }
}

/** Перестановка без мутации: элемент `from` встаёт на место `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}
