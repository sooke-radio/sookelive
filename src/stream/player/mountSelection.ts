import type { AzuracastMount } from '@/stream/azuracast/types'

export function selectMount(
  mounts: AzuracastMount[],
  preferredId: number | null,
): AzuracastMount | undefined {
  return mounts.find((m) => m.id === preferredId) ?? mounts.find((m) => m.is_default) ?? mounts[0]
}
