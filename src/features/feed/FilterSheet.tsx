import { Chip } from '@/components/ui/Chip'
import { Sheet } from '@/components/ui/Sheet'
import { STATUS_OPTIONS } from '@/components/place/status'
import type { Filters, SortKey, ViewKey } from '@/hooks/useFilters'
import { cn } from '@/lib/cn'
import { PRICE_LABEL, type Category, type PriceLevel, type Profile } from '@/types/models'

interface Props {
  open: boolean
  onClose: () => void
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  reset: () => void
  activeCount: number
  categories: Category[]
  people: Profile[]
  meId: string | null
  resultCount: number
  tagNames: string[]
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'new', label: 'новые' },
  { value: 'rating', label: 'по рейтингу' },
  { value: 'alpha', label: 'по алфавиту' },
  { value: 'cheap', label: 'сначала дешёвые' },
  { value: 'pricey', label: 'сначала дорогие' },
  { value: 'near', label: 'ближе' },
]

const VIEWS: { value: ViewKey; label: string }[] = [
  { value: 'rails', label: 'Полки' },
  { value: 'cards', label: 'Карточки' },
  { value: 'compact', label: 'Список' },
]

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <div className="mt-[18px] text-[11.5px] font-semibold tracking-[.1em] text-fg-dim uppercase first:mt-0">{title}</div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">{children}</div>
    </>
  )
}

/** Л-4, Л-5, Л-7, Л-8 — всё, что не поместилось в шапку ленты. */
export function FilterSheet({
  open,
  onClose,
  filters,
  setFilter,
  reset,
  activeCount,
  categories,
  people,
  meId,
  resultCount,
  tagNames,
}: Props) {
  const prices: PriceLevel[] = ['free', 'low', 'medium', 'high']

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex-1 text-base font-bold text-fg">Фильтры</div>
        <button
          type="button"
          onClick={reset}
          className={cn(
            'cursor-pointer rounded-pill bg-surface-2 px-[13px] py-2 text-[13px] font-semibold',
            activeCount > 0 ? 'text-accent' : 'text-fg-dimmer',
          )}
        >
          ↺ сбросить
        </button>
      </div>

      <Group title="категория">
        <Chip size="sm" active={filters.category === 'all'} onClick={() => setFilter('category', 'all')}>
          все
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            size="sm"
            active={filters.category === category.id}
            onClick={() => setFilter('category', category.id)}
          >
            {category.emoji ? `${category.emoji} ` : ''}
            {category.name}
          </Chip>
        ))}
      </Group>

      <Group title="статус">
        <Chip size="sm" active={filters.status === 'all'} onClick={() => setFilter('status', 'all')}>
          все
        </Chip>
        {STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            active={filters.status === option.value}
            onClick={() => setFilter('status', option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </Group>

      <Group title="бюджет">
        <Chip size="sm" active={filters.price === 'all'} onClick={() => setFilter('price', 'all')}>
          любой
        </Chip>
        {prices.map((price) => (
          <Chip key={price} size="sm" active={filters.price === price} onClick={() => setFilter('price', price)}>
            {PRICE_LABEL[price]}
          </Chip>
        ))}
      </Group>

      <Group title="кто хочет">
        <Chip size="sm" active={filters.want === 'all'} onClick={() => setFilter('want', 'all')}>
          все
        </Chip>
        {people.map((person) => (
          <Chip
            key={person.id}
            size="sm"
            active={filters.want === person.id}
            onClick={() => setFilter('want', person.id)}
          >
            {person.id === meId ? 'хочу я' : `хочет ${person.displayName}`}
          </Chip>
        ))}
      </Group>

      {tagNames.length > 0 ? (
        <Group title="метки">
          <Chip size="sm" active={filters.tag === 'all'} onClick={() => setFilter('tag', 'all')}>
            все
          </Chip>
          {tagNames.map((name) => (
            <Chip key={name} size="sm" active={filters.tag === name} onClick={() => setFilter('tag', name)}>
              {name}
            </Chip>
          ))}
        </Group>
      ) : null}

      <Group title="сортировка">
        {SORTS.map((option) => (
          <Chip key={option.value} size="sm" active={filters.sort === option.value} onClick={() => setFilter('sort', option.value)}>
            {option.label}
          </Chip>
        ))}
      </Group>

      <Group title="вид">
        {VIEWS.map((option) => (
          <Chip key={option.value} size="sm" active={filters.view === option.value} onClick={() => setFilter('view', option.value)}>
            {option.label}
          </Chip>
        ))}
      </Group>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-12 w-full cursor-pointer rounded-pill bg-accent text-[14.5px] font-bold text-on-accent transition-colors hover:bg-accent-hover"
      >
        Показать {resultCount}
      </button>
    </Sheet>
  )
}
