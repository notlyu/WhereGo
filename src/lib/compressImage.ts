/** Б-5: до сжатия принимаем только изображения и не больше 15 МБ. */
export const MAX_INPUT_BYTES = 15 * 1024 * 1024

/** Ф-3: 1600px по длинной стороне, WebP, q0.8, цель — уложиться в 300 КБ. */
const OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.3,
  initialQuality: 0.8,
  fileType: 'image/webp',
  useWebWorker: true,
} as const

/**
 * Н-2: аватар. Показывается кружком не больше 88px даже на десктопе —
 * 1600px там были бы в двадцать раз больше нужного, и за них платило бы
 * общее хранилище.
 */
export const AVATAR_LIMITS = { maxWidthOrHeight: 512, maxSizeMB: 0.06 }

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  /** Размер исходника — показываем в интерфейсе, насколько ужалось. */
  originalBytes: number
}

export class ImageError extends Error {}

/**
 * Ф-3: сжатие до загрузки, а не после.
 *
 * Фото с телефона весит около 3 МБ, после сжатия — примерно 200 КБ. Разница
 * в пятнадцать раз решает, когда упрёмся в гигабайт бесплатного тарифа:
 * через год или через двадцать. Поэтому сжимаем в браузере, а в хранилище
 * уходит уже готовый файл.
 */
export async function compressImage(
  file: File,
  limits?: { maxWidthOrHeight: number; maxSizeMB: number },
): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('Это не изображение')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageError(`Файл больше 15 МБ (${formatBytes(file.size)}) — такой не берём`)
  }

  // Библиотека весит 25 КБ gzip и нужна только в момент выбора файла.
  // Держать её в стартовом чанке — значит платить за неё каждым открытием
  // ленты ради действия, которое случается пару раз в месяц (П-1).
  const { default: imageCompression } = await import('browser-image-compression')

  const blob = await imageCompression(file, { ...OPTIONS, ...limits })
  const { width, height } = await readSize(blob)

  return { blob, width, height, originalBytes: file.size }
}

/** Размеры кладём в БД, чтобы верстка не прыгала до загрузки картинки. */
async function readSize(blob: Blob): Promise<{ width: number; height: number }> {
  const url = URL.createObjectURL(blob)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new ImageError('Не смогли прочитать изображение'))
      image.src = url
    })
    return { width: image.naturalWidth, height: image.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`
}
