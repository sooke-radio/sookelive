import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { server } from './helpers/msw'

// next/cache's revalidatePath/revalidateTag throw outside a real Next.js
// request context ("invariant expected app router to be mounted"), but
// every collection write in these tests goes through afterChange/
// afterDelete hooks that call them (see e.g.
// src/collections/Playlists/hooks/revalidatePlaylists.ts). Mock the whole
// module so those hooks are no-ops here; revalidateHooks.int.spec.ts
// asserts on the mocked calls directly.
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})
