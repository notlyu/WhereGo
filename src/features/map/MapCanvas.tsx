// MapLibre 6 не отдаёт default export — только именованные.
import { Map as MapLibreMap, Marker, type GeoJSONSource, type MapLayerMouseEvent, type MapMouseEvent } from 'maplibre-gl'
import { useEffect, useRef } from 'react'

import type { Coords } from '@/hooks/useGeolocation'
import { SPB_CENTER } from '@/lib/geo'
import type { Place, PlaceStatus } from '@/types/models'

import 'maplibre-gl/dist/maplibre-gl.css'

/**
 * Тайлы OpenFreeMap: без ключа, без лимитов, без регистрации.
 *
 * Стиль `dark` — готовый тёмный, под цвет приложения. Раньше здесь стоял
 * светлый positron с CSS-инверсией: он и без того почти без контраста, а
 * после invert(1) сливался в сплошной чёрный прямоугольник. Готовый тёмный
 * стиль решает это без фильтров.
 */
const STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'

/** К-2: цвет маркера по статусу. Значения — из дизайн-системы. */
const STATUS_COLOR: Record<PlaceStatus, string> = {
  want: '#4EE560',
  visited: '#9A9A9A',
  rejected: '#5C5C5C',
}

const SOURCE = 'places'

interface Props {
  places: Place[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  /** Геопозиция пользователя — отдельная точка и цель для «где я» (К-5). */
  me: Coords | null
  className?: string
  /** Ошибку карты нужно показать, а не проглотить: MapLibre шлёт её событием. */
  onError?: (message: string) => void
}

/**
 * К-1…К-4. Этот файл грузится отдельным чанком: MapLibre весит больше
 * половины бюджета бандла (П-1), и держать его в стартовой загрузке ради
 * экрана, куда заходят не каждый раз, нельзя.
 */
export function MapCanvas({ places, selectedId, onSelect, me, className, onError }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const meMarker = useRef<Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  // ── Создание карты: один раз на всю жизнь компонента ────────────────────
  useEffect(() => {
    if (!container.current || map.current) return

    const instance = new MapLibreMap({
      container: container.current,
      style: STYLE_URL,
      center: [SPB_CENTER.lng, SPB_CENTER.lat],
      zoom: 10.5,
      attributionControl: { compact: true },
    })
    map.current = instance

    // Стиль и тайлы приходят по сети. Без этого обработчика падение выглядит
    // как просто чёрный прямоугольник, и причину неоткуда узнать.
    instance.on('error', (event) => {
      const message = event.error?.message ?? 'Карта не загрузилась'
      console.error('[карта]', message, event.error)
      onErrorRef.current?.(message)
    })

    // Отдельно ловим случай, когда ошибки нет, а тайлов всё равно нет:
    // запрос молча висит, прокси режет трафик, воркер не стартовал. Снаружи
    // это неотличимо от «в этом месте пусто», поэтому говорим прямо.
    let tilesArrived = false
    instance.on('sourcedata', (event) => {
      if (event.sourceId === 'openmaptiles' && event.isSourceLoaded) tilesArrived = true
    })
    const tileWatchdog = setTimeout(() => {
      if (!tilesArrived) {
        onErrorRef.current?.('тайлы не пришли за 15 секунд — похоже, до tiles.openfreemap.org не достучаться')
      }
    }, 15_000)

    instance.on('load', () => {
      instance.addSource(SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        // К-4: кластеризацию считает сам MapLibre. Рисовать сто DOM-маркеров
        // и разводить их вручную — то, из-за чего карты и тормозят.
        cluster: true,
        clusterRadius: 48,
        clusterMaxZoom: 13,
      })

      instance.addLayer({
        id: 'clusters',
        type: 'circle',
        source: SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1E1E1E',
          'circle-stroke-color': '#4EE560',
          'circle-stroke-width': 1.5,
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 30],
        },
      })

      instance.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: SOURCE,
        filter: ['has', 'point_count'],
        layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13 },
        paint: { 'text-color': '#FFFFFF' },
      })

      instance.addLayer({
        id: 'pins',
        type: 'circle',
        source: SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['case', ['get', 'selected'], 11, 8],
          'circle-stroke-color': '#0D0D0D',
          'circle-stroke-width': 2.5,
        },
      })

      // К-3: клик по маркеру выбирает место, мини-карточку рисует родитель.
      instance.on('click', 'pins', (event: MapLayerMouseEvent) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') onSelectRef.current(id)
      })

      // К-4: клик по кластеру приближает, пока он не распадётся.
      instance.on('click', 'clusters', (event: MapLayerMouseEvent) => {
        const feature = event.features?.[0]
        const clusterId = feature?.properties?.cluster_id
        if (clusterId === undefined) return
        const source = instance.getSource(SOURCE) as GeoJSONSource
        void source.getClusterExpansionZoom(Number(clusterId)).then((zoom) => {
          const [lng, lat] = (feature!.geometry as { coordinates: [number, number] }).coordinates
          instance.easeTo({ center: [lng, lat], zoom })
        })
      })

      // Пустой клик по карте снимает выбор — мини-карточка не должна
      // висеть, когда пользователь уже смотрит в другое место.
      instance.on('click', (event: MapMouseEvent) => {
        const hits = instance.queryRenderedFeatures(event.point, { layers: ['pins', 'clusters'] })
        if (hits.length === 0) onSelectRef.current(null)
      })

      for (const layer of ['pins', 'clusters']) {
        instance.on('mouseenter', layer, () => (instance.getCanvas().style.cursor = 'pointer'))
        instance.on('mouseleave', layer, () => (instance.getCanvas().style.cursor = ''))
      }
    })

    // MapLibre из коробки слушает resize окна, но не своего контейнера.
    // Если карта смонтирована в скрытом или ещё не разложенном блоке, она
    // создаётся размером 0×0 и остаётся пустой навсегда: тайлы для нулевого
    // вьюпорта не запрашиваются, а повторно карта не мерит себя сама.
    // Наблюдатель чинит и это, и смену ориентации телефона.
    const resizeObserver = new ResizeObserver(() => instance.resize())
    resizeObserver.observe(container.current)

    return () => {
      clearTimeout(tileWatchdog)
      resizeObserver.disconnect()
      instance.remove()
      map.current = null
    }
  }, [])

  // ── Данные: пересобираются при смене фильтров ленты (К-6) ──────────────
  useEffect(() => {
    const instance = map.current
    if (!instance) return

    const apply = () => {
      const source = instance.getSource(SOURCE) as GeoJSONSource | undefined
      if (!source) return

      source.setData({
        type: 'FeatureCollection',
        features: places
          .filter((place) => place.lat !== null && place.lng !== null)
          .map((place) => ({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [place.lng as number, place.lat as number] },
            properties: {
              id: place.id,
              color: STATUS_COLOR[place.status],
              selected: place.id === selectedId,
            },
          })),
      })
    }

    if (instance.isStyleLoaded()) apply()
    else instance.once('load', apply)
  }, [places, selectedId])

  // ── Выбранное место: подлетаем к нему ───────────────────────────────────
  useEffect(() => {
    const instance = map.current
    if (!instance || !selectedId) return
    const place = places.find((item) => item.id === selectedId)
    if (!place?.lat || !place.lng) return

    instance.easeTo({ center: [place.lng, place.lat], zoom: Math.max(instance.getZoom(), 14), duration: 600 })
  }, [selectedId, places])

  // ── К-5: своя точка ─────────────────────────────────────────────────────
  useEffect(() => {
    const instance = map.current
    if (!instance || !me) return

    meMarker.current?.remove()

    const dot = document.createElement('div')
    dot.className = 'h-3.5 w-3.5 rounded-full bg-[#4EA8E5] ring-4 ring-[#4EA8E5]/25'
    meMarker.current = new Marker({ element: dot }).setLngLat([me.lng, me.lat]).addTo(instance)

    instance.easeTo({ center: [me.lng, me.lat], zoom: 13, duration: 700 })

    return () => {
      meMarker.current?.remove()
      meMarker.current = null
    }
  }, [me])

  return <div ref={container} className={className} />
}
