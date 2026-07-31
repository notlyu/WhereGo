import { useEffect } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import type { PlaceFormValues } from '@/features/place-form/schema'

const KEY = 'kuda-poyti/draft/place'

/**
 * Н-3: черновик формы живёт в localStorage до успешной отправки.
 *
 * Место добавляют с телефона, стоя на улице, — вкладка легко закрывается сама.
 * Потерять при этом набранное описание обиднее, чем вообще не начать.
 */
export function useDraft(form: UseFormReturn<PlaceFormValues>, { enabled }: { enabled: boolean }) {
  const { watch, reset, formState } = form

  // Восстановление — один раз, до первого ввода.
  useEffect(() => {
    if (!enabled) return
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    try {
      reset(JSON.parse(raw) as PlaceFormValues, { keepDefaultValues: true })
    } catch {
      localStorage.removeItem(KEY)
    }
  }, [enabled, reset])

  // Сохранение на каждое изменение.
  useEffect(() => {
    if (!enabled) return
    const subscription = watch((values) => {
      if (!values.title && !values.description && !values.address && !values.sourceUrl) {
        localStorage.removeItem(KEY)
        return
      }
      localStorage.setItem(KEY, JSON.stringify(values))
    })
    return () => subscription.unsubscribe()
  }, [enabled, watch])

  // Отправили успешно — черновик больше не нужен.
  useEffect(() => {
    if (enabled && formState.isSubmitSuccessful) localStorage.removeItem(KEY)
  }, [enabled, formState.isSubmitSuccessful])
}
