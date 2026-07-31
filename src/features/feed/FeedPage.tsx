import { useIsDesktop } from '@/hooks/useIsDesktop'

import { DesktopFeed } from './DesktopFeed'
import { MobileFeed } from './MobileFeed'
import { useFeedData } from './useFeedData'

/** Данные общие, вёрстка разная — макеты телефона и десктопа не совпадают. */
export function FeedPage() {
  const isDesktop = useIsDesktop()
  const data = useFeedData()

  return isDesktop ? <DesktopFeed {...data} /> : <MobileFeed {...data} />
}
