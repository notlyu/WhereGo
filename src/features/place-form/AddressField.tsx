import { Loader2, MapPin, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { geocodeDebounced, type GeocodeResult } from '@/api/geocode'
import { Input, Label } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

interface Props {
  address: string
  lat: number | null
  lng: number | null
  onChange: (next: { address: string; lat: number | null; lng: number | null }) => void
  desktop?: boolean
}

/**
 * М-9, М-10: адрес с подсказками Nominatim.
 *
 * Координаты ставятся выбором подсказки, а не перетаскиванием маркера, как
 * задумано в М-10: тащить точку по карте в форме — это вторая карта на
 * экране и ещё один чанк MapLibre в форме места. Для города, где у всего
 * есть адрес, выбор из списка точнее и быстрее. Ручная правка остаётся:
 * широту и долготу видно и можно стереть.
 */
export function AddressField({ address, lat, lng, onChange, desktop = false }: Props) {
  const [query, setQuery] = useState(address)
  const [results, setResults] = useState<GeocodeResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  /** Не искать сразу после выбора подсказки — иначе список откроется снова. */
  const skipNext = useRef(false)

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false
      return
    }
    if (query.trim().length < 3) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    setError(null)
    geocodeDebounced(
      query,
      (found) => {
        setResults(found)
        setSearching(false)
        setOpen(true)
      },
      (message) => {
        setError(message)
        setSearching(false)
      },
    )
  }, [query])

  function pick(result: GeocodeResult) {
    skipNext.current = true
    setQuery(result.label)
    setOpen(false)
    setResults([])
    onChange({ address: result.label, lat: result.lat, lng: result.lng })
  }

  function clearCoords() {
    onChange({ address: query, lat: null, lng: null })
  }

  const hasCoords = lat !== null && lng !== null

  return (
    <div className="relative">
      <Label hint={hasCoords ? undefined : 'необязательно'}>адрес</Label>

      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          onChange({ address: event.target.value, lat, lng })
        }}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Улица, дом — подскажем по мере ввода"
      />

      {searching ? (
        <div className="mt-2 flex items-center gap-2 text-[12.5px] text-fg-dim">
          <Loader2 size={13} className="animate-spin" />
          ищем адрес…
        </div>
      ) : null}

      {error ? <div className="mt-2 text-[12.5px] text-[#FF7A6B]">{error}</div> : null}

      {open && results.length > 0 ? (
        <div
          className={cn(
            'animate-pop absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-card shadow-2xl shadow-black/50',
            desktop ? 'bg-surface-d' : 'bg-surface-3',
          )}
        >
          {results.map((result) => (
            <button
              key={`${result.lat},${result.lng}`}
              type="button"
              onClick={() => pick(result)}
              className="flex w-full cursor-pointer items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-surface-4"
            >
              <MapPin size={14} className="mt-0.5 flex-none text-accent" />
              <span className="text-[13.5px] leading-snug text-fg">{result.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {hasCoords ? (
        <div className="mt-2.5 flex items-center gap-2 text-[12.5px] text-fg-dim">
          <MapPin size={13} className="flex-none text-accent" />
          <span>
            точка на карте: {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
          <button
            type="button"
            onClick={clearCoords}
            aria-label="Убрать точку"
            className="cursor-pointer text-fg-dimmer transition-colors hover:text-[#FF7A6B]"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <div className="mt-2.5 text-[12.5px] leading-relaxed text-fg-dim">
          Выберите подсказку — место встанет на карту. Без точки оно останется только в ленте.
        </div>
      )}
    </div>
  )
}
