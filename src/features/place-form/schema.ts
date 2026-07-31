import { z } from 'zod'

import type { PlaceInput } from '@/types/models'

/**
 * Б-4: одна схема на валидацию и типы. Ограничения повторяют `check` в БД
 * (0001_init.sql) — расхождение означало бы, что форма пропускает то, на чём
 * потом падает вставка.
 */
export const placeSchema = z.object({
  title: z.string().trim().min(1, 'Без названия не сохраним').max(200, 'Слишком длинное название'),
  categoryId: z.string().nullable(),
  description: z.string().trim().max(4000).nullable(),
  address: z.string().trim().max(300).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  sourceUrl: z.union([z.string().trim().url('Это не похоже на ссылку'), z.literal('')]).nullable(),
  sourceTitle: z.string().trim().max(300).nullable(),
  price: z.enum(['free', 'low', 'medium', 'high']).nullable(),
  isIdea: z.boolean(),
})

export type PlaceFormValues = z.infer<typeof placeSchema>

export const EMPTY_PLACE: PlaceFormValues = {
  title: '',
  categoryId: null,
  description: null,
  address: null,
  lat: null,
  lng: null,
  sourceUrl: null,
  sourceTitle: null,
  price: null,
  isIdea: false,
}

/** Пустые строки в БД не нужны — там для «ничего не указано» есть null. */
export function toInput(values: PlaceFormValues): PlaceInput {
  const blankToNull = (value: string | null) => (value && value.trim() ? value.trim() : null)

  return {
    title: values.title.trim(),
    categoryId: values.categoryId,
    description: blankToNull(values.description),
    address: blankToNull(values.address),
    lat: values.lat,
    lng: values.lng,
    sourceUrl: blankToNull(values.sourceUrl),
    sourceTitle: blankToNull(values.sourceTitle),
    price: values.price,
    isIdea: values.isIdea,
  }
}
