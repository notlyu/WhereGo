import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

interface Props {
  name: string
  url?: string | null
  size?: number
  accent?: boolean
  className?: string
}

export function Avatar({ name, url, size = 28, accent = false, className }: Props) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className={cn('flex-none rounded-pill object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex flex-none items-center justify-center rounded-pill font-bold',
        accent ? 'bg-accent text-on-accent' : 'bg-surface-4 text-fg',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.39) }}
    >
      {initials(name)}
    </div>
  )
}
