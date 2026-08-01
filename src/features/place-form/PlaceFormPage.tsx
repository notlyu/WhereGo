import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'

import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FieldError, Input, Label, Textarea } from '@/components/ui/Field'
import { Segmented } from '@/components/ui/Segmented'
import { useCreatePlace, usePlace, useUpdatePlace } from '@/hooks/queries'
import { useDraft } from '@/hooks/useDraft'
import { useIsDesktop } from '@/hooks/useIsDesktop'
import { cn } from '@/lib/cn'
import { PRICE_LABEL, type PriceLevel } from '@/types/models'

import { AddressField } from './AddressField'
import { CategoryPicker } from './CategoryPicker'
import { EMPTY_PLACE, placeSchema, toInput, type PlaceFormValues } from './schema'

const PRICES: PriceLevel[] = ['free', 'low', 'medium', 'high']

/** М-1, М-6, М-8. Один экран на создание и правку — поля те же. */
export function PlaceFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const isEdit = Boolean(id)

  const { data: place, isPending: loadingPlace } = usePlace(id)
  const create = useCreatePlace()
  const update = useUpdatePlace(id ?? '')

  const form = useForm<PlaceFormValues>({
    resolver: zodResolver(placeSchema),
    defaultValues: EMPTY_PLACE,
  })

  // Н-3: черновик нового места переживает случайное закрытие вкладки.
  // При правке существующего черновик не нужен — исходник и так в БД.
  useDraft(form, { enabled: !isEdit })

  useEffect(() => {
    if (!isEdit || !place) return
    form.reset({
      title: place.title,
      categoryId: place.categoryId,
      description: place.description,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      sourceUrl: place.sourceUrl,
      sourceTitle: place.sourceTitle,
      price: place.price,
      isIdea: place.isIdea,
    })
  }, [isEdit, place, form])

  const busy = create.isPending || update.isPending
  const failure = create.error ?? update.error

  const onSubmit = form.handleSubmit(async (values) => {
    const input = toInput(values)
    if (isEdit && id) {
      await update.mutateAsync(input)
      void navigate(`/place/${id}`)
    } else {
      const created = await create.mutateAsync(input)
      void navigate(`/place/${created.id}`, { replace: true })
    }
  })

  if (isEdit && loadingPlace) {
    return <div className="mx-5 mt-6 h-[60vh] animate-pulse rounded-card bg-surface-2 desktop:mx-0" />
  }

  const title = isEdit ? 'Правим место' : 'Новое место'

  // ── Левая колонка десктопа / верх формы на телефоне ──────────────────────
  const primary = (
    <>
      <Label hint="необязательно">ссылка на видео</Label>
      <Input {...form.register('sourceUrl')} placeholder="Вставь ссылку или оставь пустым" className="text-sm" inputMode="url" />
      <FieldError>{form.formState.errors.sourceUrl?.message}</FieldError>

      {form.watch('sourceUrl') ? (
        <div className="mt-4">
          <Label>как подписать источник</Label>
          <Input {...form.register('sourceTitle')} placeholder="«Стейки за 900 в центре Питера» · TikTok" className="text-sm" />
          {/* М-14 (подтянуть превью автоматически) отложено — пока подпись руками. */}
        </div>
      ) : null}

      <Section>
        <Label>название</Label>
        <Input {...form.register('title')} placeholder="Как называется" className="text-[17px] font-semibold" />
        <FieldError>{form.formState.errors.title?.message}</FieldError>
      </Section>

      <Section>
        <Controller
          control={form.control}
          name="address"
          render={({ field }) => (
            <AddressField
              address={field.value ?? ''}
              lat={form.watch('lat')}
              lng={form.watch('lng')}
              desktop={isDesktop}
              onChange={(next) => {
                field.onChange(next.address)
                form.setValue('lat', next.lat, { shouldDirty: true })
                form.setValue('lng', next.lng, { shouldDirty: true })
              }}
            />
          )}
        />
      </Section>
    </>
  )

  // ── Правая колонка десктопа / низ формы на телефоне ──────────────────────
  const secondary = (
    <>
      <Controller
        control={form.control}
        name="categoryId"
        render={({ field }) => <CategoryPicker value={field.value} onChange={field.onChange} />}
      />

      <Section>
        <Label hint="необязательно">описание</Label>
        <Textarea {...form.register('description')} placeholder="Что там интересного и что важно не забыть" />
      </Section>

      <Section>
        <Label>бюджет</Label>
        <div className="flex flex-wrap gap-2">
          <Controller
            control={form.control}
            name="price"
            render={({ field }) => (
              <>
                <Chip active={field.value === null} onClick={() => field.onChange(null)}>
                  не знаем
                </Chip>
                {PRICES.map((price) => (
                  <Chip key={price} active={field.value === price} onClick={() => field.onChange(price)}>
                    {PRICE_LABEL[price]}
                  </Chip>
                ))}
              </>
            )}
          />
        </div>
      </Section>

      <Section>
        <Label>что это</Label>
        <Controller
          control={form.control}
          name="isIdea"
          render={({ field }) => (
            <Segmented
              className={cn('max-w-[360px]', isDesktop && 'bg-surface-1 p-[5px]')}
              value={field.value ? 'idea' : 'place'}
              onChange={(next) => field.onChange(next === 'idea')}
              options={[
                { value: 'place', label: 'Место' },
                { value: 'idea', label: 'Идея' },
              ]}
            />
          )}
        />
      </Section>

      {failure ? (
        <div className="mt-5 rounded-card bg-surface-2 px-4 py-3 text-[13.5px] text-[#FF7A6B]">
          {failure instanceof Error ? failure.message : 'Не получилось сохранить'}
        </div>
      ) : null}

      <Button type="submit" disabled={busy} className={cn('w-full', isDesktop ? 'mt-7 h-[54px]' : 'mt-7')}>
        {busy ? 'Сохраняем…' : isEdit ? 'Сохранить изменения' : 'Сохранить место'}
      </Button>
    </>
  )

  if (isDesktop) {
    return (
      <form onSubmit={onSubmit} className="max-w-[860px]">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-pill bg-surface-d pr-[18px] pl-3.5 text-[13.5px] font-semibold text-fg transition-colors hover:bg-surface-2"
        >
          <ArrowLeft size={15} />
          Назад
        </button>
        <h1 className="mt-[18px] font-display text-[44px] leading-none font-medium tracking-[-.02em] text-fg">{title}</h1>

        <div className="mt-7 grid items-start gap-6 grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          <div>{primary}</div>
          <div>{secondary}</div>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={onSubmit} className="px-5 pt-2.5 pb-10">
      <div className="flex items-center gap-3.5 pt-2 pb-5">
        <button
          type="button"
          onClick={() => void navigate(-1)}
          aria-label="Назад"
          className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-pill bg-surface-2 text-fg transition-colors hover:bg-surface-4"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-display text-[30px] font-medium tracking-[-.02em] text-fg">{title}</h1>
      </div>

      {primary}
      <Section>{secondary}</Section>
    </form>
  )
}

function Section({ children }: { children: ReactNode }) {
  return <div className="mt-6">{children}</div>
}
