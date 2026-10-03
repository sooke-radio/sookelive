import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

let cached: Payload | null = null

// getPayload() itself memoizes per-config-object, but caching here too
// avoids re-awaiting the config promise/import from every test file.
export async function getTestPayload(): Promise<Payload> {
  if (!cached) {
    cached = await getPayload({ config })
  }
  return cached
}

export async function deleteAll(
  payload: Payload,
  collection: 'playlists' | 'shows' | 'pages' | 'posts' | 'hosts' | 'users' | 'episodes',
) {
  await payload.delete({
    collection,
    where: { id: { exists: true } },
  })
}
