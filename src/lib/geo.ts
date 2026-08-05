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

/**
 * Ссылка на точку в Яндекс Картах — оттуда строится маршрут.
 *
 * Координаты Яндекс ждёт в порядке «долгота, широта», обратном привычному по
 * GPS и по нашей же модели. Перепутанные местами координаты Петербурга уводят
 * в Сомали, и делают это молча: карта откроется, просто не там. Отсюда
 * отдельная функция вместо строки по месту — и тест на порядок.
 *
 * Ссылка обычная, а не схема `yandexmaps://`: на телефоне её и так перехватит
 * приложение, если оно стоит, а на компьютере откроется веб-версия. Схема же
 * без приложения ведёт в никуда.
 */
export function yandexMapsUrl(lat: number, lng: number): string {
  // Шесть знаков — это сантиметры. Заодно `toFixed` не даёт числу уйти
  // в экспоненциальную запись, которую Яндекс не разберёт.
  const point = `${lng.toFixed(6)},${lat.toFixed(6)}`

  // `whatshere` открывает карточку точки — с адресом и кнопкой «Маршрут»,
  // ради которой в карты и уходят. Простая метка `pt` карточку не открывает.
  // Свой `zoom` внутри `whatshere` Яндекс при этом игнорирует, поэтому масштаб
  // задаём ещё и парой `ll`/`z` — иначе карта открывается на весь город.
  const params = new URLSearchParams({
    'whatshere[point]': point,
    'whatshere[zoom]': '17',
    ll: point,
    z: '17',
  })

  return `https://yandex.ru/maps/?${params}`
}

export { formatDistance } from './format'
