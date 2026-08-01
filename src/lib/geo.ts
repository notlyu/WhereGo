/** Расстояние по прямой между двумя точками, в метрах (формула гаверсинуса). */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6_371_000
  const toRad = (deg: number) => (deg * Math.PI) / 180

  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2

  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Центр Петербурга — точка отсчёта, пока геопозиция не разрешена (М-13, Этап 3). */
export const SPB_CENTER = { lat: 59.9386, lng: 30.3141 }

export { formatDistance } from './format'
