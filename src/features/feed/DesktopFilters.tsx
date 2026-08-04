import { Chip } from '@/components/ui/Chip'
import { STATUS_OPTIONS } from '@/components/place/status'
import type { Filters, SortKey } from '@/hooks/useFilters'
import { cn } from '@/lib/cn'
import type { Category, Profile } from '@/types/models'

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'new', label: 'новые' },
  { value: 'rating', label: 'по рейтингу' },
  { value: 'alpha', label: 'по алфавиту' },
  { value: 'cheap', label: 'дешевле' },
  { value: 'pricey', label: 'дороже' },
  { value: 'near', label: 'ближе' },
]

interface Props {
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  reset: () => void
  activeCount: number
  categories: Category[]
  people: Profile[]
  meId: string | null
  tagNames: string[]
}

/**
 * Десктопные фильтры — раскрывающаяся панель под заголовком, а не нижняя
 * шторка: на широком экране шторка снизу выглядит как чужеродный мобильный
 * приём, и в макете её нет.
 */
export function DesktopFilters({ filters, setFilter, reset, activeCount, categories, people, meId, tagNames }: Props) {
  return (
    <div className="animate-pop mt-[22px] flex flex-wrap items-center gap-[18px] rounded-[20px] bg-surface-1 px-5 py-4">
      <Group title="категория">
        <Chip size="sm" tone="contrast" active={filters.category === 'all'} onClick={() => setFilter('category', 'all')}>
          все
        </Chip>
        {categories.map((category) => (
          <Chip
            key={category.id}
            size="sm"
            tone="contrast"
            active={filters.category === category.id}
            onClick={() => setFilter('category', category.id)}
          >
            {category.name}
          </Chip>
        ))}
      </Group>

      <Divider />

      <Group title="статус">
        <Chip size="sm" tone="contrast" active={filters.status === 'all'} onClick={() => setFilter('status', 'all')}>
          любой
        </Chip>
        {STATUS_OPTIONS.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            tone="contrast"
            active={filters.status === option.value}
            onClick={() => setFilter('status', option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </Group>

      <Divider />

      <Group title="кто хочет">
        <Chip size="sm" tone="contrast" active={filters.want === 'all'} onClick={() => setFilter('want', 'all')}>
          неважно
        </Chip>
        {people.map((person) => (
          <Chip
            key={person.id}
            size="sm"
            tone="contrast"
            active={filters.want === person.id}
            onClick={() => setFilter('want', person.id)}
          >
            {person.id === meId ? 'только я' : `только ${person.displayName}`}
          </Chip>
        ))}
      </Group>

      {tagNames.length > 0 ? (
        <>
          <Divider />
          <Group title="метки">
            <Chip size="sm" tone="contrast" active={filters.tag === 'all'} onClick={() => setFilter('tag', 'all')}>
              все
            </Chip>
            {tagNames.map((name) => (
              <Chip key={name} size="sm" tone="contrast" active={filters.tag === name} onClick={() => setFilter('tag', name)}>
                {name}
              </Chip>
            ))}
          </Group>
        </>
      ) : null}

      <Divider />

      <Group title="сортировка">
        {SORTS.map((option) => (
          <Chip
            key={option.value}
            size="sm"
            tone="contrast"
            active={filters.sort === option.value}
            onClick={() => setFilter('sort', option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </Group>

      <button
        type="button"
        onClick={reset}
        className={cn(
          'ml-auto cursor-pointer rounded-pill bg-border px-3.5 py-[9px] text-[13px] font-semibold transition-colors',
          activeCount > 0 ? 'text-accent hover:bg-surface-3' : 'text-fg-dimmer',
        )}
      >
        ↺ сбросить
      </button>
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <div className="text-[11.5px] font-semibold tracking-[.1em] text-fg-dim uppercase">{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function Divider() {
  return <div className="h-[26px] w-px bg-surface-3" />
}
