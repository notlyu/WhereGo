import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import { photos as photosApi } from '@/api'
import type { PhotoTarget } from '@/api/backend'
import { compressImage, ImageError } from '@/lib/compressImage'

import { queryKeys } from './queries'

export interface UploadItem {
  /** Локальный идентификатор — файла в БД ещё нет. */
  id: string
  name: string
  /** 0…100. Реального прогресса передачи нет, см. комментарий ниже. */
  progress: number
  status: 'compressing' | 'uploading' | 'done' | 'failed'
  error?: string
  /** Превью из исходного файла — показываем, не дожидаясь загрузки. */
  previewUrl: string
}

/**
 * Ф-2, Ф-3, Ф-6: сжатие и загрузка пачки файлов с показом состояния.
 *
 * Файлы идут по одному, а не параллельно: сжатие занимает процессор, и
 * четыре одновременных обработки на телефоне подвешивают интерфейс сильнее,
 * чем экономят время.
 *
 * Ф-6 просит индикатор прогресса на каждый файл. Честного процента передачи
 * `supabase-js` не даёт — под капотом `fetch`, у которого нет событий выгрузки.
 * Поэтому показываем стадии: сжимаем → отправляем → готово. Врать процентами,
 * которые не считаются, хуже, чем показывать настоящую стадию.
 */
export function useUploadPhotos(target: PhotoTarget, placeId: string) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<UploadItem[]>([])
  const [busy, setBusy] = useState(false)

  const patch = useCallback((id: string, next: Partial<UploadItem>) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...next } : item)))
  }, [])

  const upload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return
      setBusy(true)

      const queued: UploadItem[] = files.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        progress: 0,
        status: 'compressing',
        previewUrl: URL.createObjectURL(file),
      }))
      setItems((list) => [...list, ...queued])

      for (const [index, file] of files.entries()) {
        const item = queued[index]
        try {
          const compressed = await compressImage(file)
          patch(item.id, { status: 'uploading', progress: 60 })

          await photosApi.upload(target, compressed.blob, { width: compressed.width, height: compressed.height })
          patch(item.id, { status: 'done', progress: 100 })
        } catch (cause) {
          // Н-5: сбой одного файла не отменяет ни остальные, ни само место.
          patch(item.id, {
            status: 'failed',
            error: cause instanceof ImageError || cause instanceof Error ? cause.message : 'Не загрузилось',
          })
        }
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.photos(placeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.place(placeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
      void queryClient.invalidateQueries({ queryKey: queryKeys.storageUsage })
      setBusy(false)
    },
    [patch, placeId, queryClient, target],
  )

  /** Убирает из списка загруженные — неудачные оставляем, чтобы было видно. */
  const clearDone = useCallback(() => {
    setItems((list) => {
      list.filter((item) => item.status === 'done').forEach((item) => URL.revokeObjectURL(item.previewUrl))
      return list.filter((item) => item.status !== 'done')
    })
  }, [])

  return { items, busy, upload, clearDone }
}
