import { GripVertical, ImagePlus, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { MAX_PHOTOS_PER_PLACE } from '@/types/models'

import { moveItem, useDragSort } from './useDragSort'

/**
 * Выбранные, но ещё не отправленные файлы.
 *
 * Нужен там, где фото прикрепляют к записи, которой пока нет: у нового места
 * и нового отзыва id появляется только после сохранения, а `photos.upload`
 * без id крепить не к чему. Поэтому файлы копятся здесь и уходят следом
 * за сохранением — см. [[Decisions#Р-21]].
 */
export function PendingPhotos({
  files,
  onChange,
  desktop = false,
  hint,
}: {
  files: File[]
  onChange: (next: File[]) => void
  desktop?: boolean
  /** Чем объяснить задержку отправки. У места и отзыва формулировки разные. */
  hint: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])
  /**
   * Постоянный ключ на каждый файл.
   *
   * По имени и позиции ключ не годится: перестановка меняет позицию, React
   * считает плитку новой и пересобирает её — прямо посреди перетаскивания.
   * Ручка, за которую тянут, при этом исчезает, и жест обрывается на первом
   * же шаге. `File` при перестановке остаётся тем же объектом, поэтому
   * ключи держим у самих файлов.
   */
  const keys = useRef(new WeakMap<File, string>())
  const keyOf = (file: File) => {
    let key = keys.current.get(file)
    if (!key) {
      key = crypto.randomUUID()
      keys.current.set(file, key)
    }
    return key
  }
  const [hovering, setHovering] = useState(false)
  const left = MAX_PHOTOS_PER_PLACE - files.length

  // Ф-9: порядок задаётся здесь же — первым уйдёт то, что станет обложкой.
  const { containerRef, dragging, handleProps, keyProps } = useDragSort({
    count: files.length,
    onMove: (from, to) => onChange(moveItem(files, from, to)),
  })

  // Превью — ссылки на объекты в памяти вкладки. Браузер сам их не отпустит:
  // отзываем на каждой смене набора и при уходе с формы, иначе картинки
  // висят до перезагрузки страницы.
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file))
    setPreviews(urls)
    return () => urls.forEach((url) => URL.revokeObjectURL(url))
  }, [files])

  function accept(list: FileList | null) {
    if (!list) return
    const picked = [...list].slice(0, Math.max(left, 0))
    if (picked.length) onChange([...files, ...picked])
  }

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between">
        <div className="eyebrow">фото</div>
        <div className="text-xs text-fg-dimmer">
          {left > 0 ? `можно ещё ${left}` : `предел — ${MAX_PHOTOS_PER_PLACE}`}
        </div>
      </div>

      <div ref={containerRef} className="grid grid-cols-3 gap-2.5">
        {files.map((file, index) => (
          <div
            key={keyOf(file)}
            data-sort-index={index}
            className={cn(
              'relative aspect-square overflow-hidden rounded-card bg-surface-1 transition-transform',
              dragging === index && 'scale-[1.06] ring-2 ring-accent',
            )}
          >
            {previews[index] ? <img src={previews[index]} alt="" className="h-full w-full object-cover" /> : null}

            {index === 0 ? (
              <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-pill bg-accent px-2 py-1 text-[10px] font-bold text-on-accent">
                главное
              </div>
            ) : null}

            {files.length > 1 ? (
              <button
                type="button"
                aria-label={`Переставить фото ${index + 1}. Стрелки влево и вправо двигают его`}
                className="absolute right-1.5 bottom-1.5 flex h-7 w-7 cursor-grab touch-none items-center justify-center rounded-pill bg-bg/70 text-fg-muted backdrop-blur-md transition-colors hover:text-fg active:cursor-grabbing"
                {...handleProps(index)}
                {...keyProps(index)}
              >
                <GripVertical size={13} />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => onChange(files.filter((_, i) => i !== index))}
              aria-label={`Убрать ${file.name}`}
              className="absolute top-1.5 right-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-pill bg-bg/70 text-fg-muted backdrop-blur-md transition-colors hover:text-[#FF7A6B]"
            >
              <X size={13} />
            </button>
          </div>
        ))}

        {left > 0 ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setHovering(true)
            }}
            onDragLeave={() => setHovering(false)}
            onDrop={(event) => {
              event.preventDefault()
              setHovering(false)
              accept(event.dataTransfer.files)
            }}
            className={cn(
              'flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed px-2 text-center transition-colors',
              hovering
                ? 'border-accent bg-accent/5 text-accent'
                : 'border-border-4 text-fg-dimmer hover:border-accent hover:text-accent',
            )}
          >
            <ImagePlus size={20} />
            <span className="font-mono text-[10.5px] leading-tight">{desktop ? 'перетащи сюда' : 'добавить'}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          accept(event.target.files)
          event.target.value = ''
        }}
      />

      {files.length ? <div className="mt-2.5 text-[12.5px] leading-relaxed text-fg-dim">{hint}</div> : null}
    </div>
  )
}
