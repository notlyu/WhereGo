import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { categories as categoriesApi, places as placesApi, reviews as reviewsApi } from '@/api'
import type { Place, PlaceInput, PlaceStatus, ReviewInput } from '@/types/models'

export const queryKeys = {
  places: ['places'] as const,
  place: (id: string) => ['places', id] as const,
  categories: ['categories'] as const,
  reviews: (placeId: string) => ['reviews', placeId] as const,
}

export function usePlaces() {
  return useQuery({
    queryKey: queryKeys.places,
    queryFn: () => placesApi.list(),
  })
}

export function usePlace(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.place(id ?? ''),
    queryFn: () => placesApi.get(id as string),
    enabled: Boolean(id),
  })
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => categoriesApi.list(),
    // Справочник меняется руками и редко — держим дольше ленты.
    staleTime: 30 * 60 * 1000,
  })
}

export function useCreatePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlaceInput) => placesApi.create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.places }),
  })
}

export function useUpdatePlace(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlaceInput) => placesApi.update(id, input),
    onSuccess: (place) => {
      queryClient.setQueryData(queryKeys.place(id), place)
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
    },
  })
}

export function useDeletePlace() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => placesApi.remove(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.places }),
  })
}

/**
 * М-5: статус меняет любой. Обновляем оптимистично — нажатие на сегмент
 * должно откликаться мгновенно, а не после круга до Supabase и обратно.
 */
export function useSetPlaceStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: PlaceStatus }) => placesApi.setStatus(id, status),

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.places })
      await queryClient.cancelQueries({ queryKey: queryKeys.place(id) })

      const prevList = queryClient.getQueryData<Place[]>(queryKeys.places)
      const prevOne = queryClient.getQueryData<Place>(queryKeys.place(id))

      queryClient.setQueryData<Place[]>(queryKeys.places, (list) =>
        list?.map((p) => (p.id === id ? { ...p, status } : p)),
      )
      queryClient.setQueryData<Place | null>(queryKeys.place(id), (place) => (place ? { ...place, status } : place))

      return { prevList, prevOne }
    },

    onError: (_error, { id }, context) => {
      if (context?.prevList) queryClient.setQueryData(queryKeys.places, context.prevList)
      if (context?.prevOne) queryClient.setQueryData(queryKeys.place(id), context.prevOne)
    },

    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
      void queryClient.invalidateQueries({ queryKey: queryKeys.place(id) })
    },
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => categoriesApi.create(name),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.categories }),
  })
}

export function useRenameCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoriesApi.rename(id, name),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories })
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
    },
  })
}

export function useReviews(placeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.reviews(placeId ?? ''),
    queryFn: () => reviewsApi.listForPlace(placeId as string),
    enabled: Boolean(placeId),
  })
}

/**
 * О-1, О-7: сохранение отзыва — upsert, повторное правит существующий.
 *
 * О-6 живёт здесь, а не в адаптерах: правило «отзыв переводит место в
 * `visited`» одно на оба бэкенда, и дублировать его в двух реализациях
 * значило бы завести два места, где оно может разойтись. Через этот хук
 * проходит весь интерфейс, другого пути оставить отзыв нет.
 */
export function useSaveReview(placeId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      const review = await reviewsApi.save(placeId, input)

      const place = queryClient.getQueryData<Place>(queryKeys.place(placeId))
      if (place && place.status !== 'visited') {
        // Сбой здесь не должен отменять уже сохранённый отзыв: статус —
        // приятное дополнение, а текст пользователь писал руками.
        await placesApi.setStatus(placeId, 'visited').catch(() => undefined)
      }

      return review
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(placeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.place(placeId) })
      // Средняя оценка и статус видны в ленте — её тоже освежаем.
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
    },
  })
}

export function useDeleteReview(placeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => reviewsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reviews(placeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.place(placeId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.places })
    },
  })
}
