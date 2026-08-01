import { useCallback, useState } from 'react'

export interface Coords {
  lat: number
  lng: number
}

/**
 * К-5, М-13: геопозиция по требованию, а не при открытии экрана.
 *
 * Спрашивать разрешение сразу при загрузке — верный способ получить отказ
 * навсегда: браузер запоминает его и второй раз уже не спросит. Поэтому
 * запрос идёт только по нажатию кнопки «где я».
 */
const CACHE_KEY = 'kuda-poyti/geo/v1'
/** Через час координаты считаем несвежими: город за час можно пересечь. */
const MAX_AGE_MS = 60 * 60 * 1000

/**
 * Разрешение спрашивается один раз, а результат нужен и карте, и ленте.
 * Поэтому последняя известная точка переживает переход между экранами.
 */
function readCached(): Coords | null {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as (Coords & { at: number }) | null
    if (!raw || Date.now() - raw.at > MAX_AGE_MS) return null
    return { lat: raw.lat, lng: raw.lng }
  } catch {
    return null
  }
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(readCached)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Браузер не умеет определять местоположение')
      return
    }

    setBusy(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setCoords(next)
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ...next, at: Date.now() }))
        } catch {
          // приватный режим — расстояния просто не переживут переход
        }
        setBusy(false)
      },
      (cause) => {
        setError(
          cause.code === cause.PERMISSION_DENIED
            ? 'Доступ к геопозиции закрыт — разрешение даётся в настройках браузера'
            : 'Не смогли определить, где вы',
        )
        setBusy(false)
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    )
  }, [])

  return { coords, error, busy, locate }
}
