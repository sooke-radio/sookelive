import type { AzuracastMount } from '@/stream/azuracast/types'

export type StreamMetadata = {
  show: string
  showSrc?: string | null
  title?: string
  playlist?: string
  artist?: string
  live?: boolean
  streamer?: string
  mounts?: AzuracastMount[]
}