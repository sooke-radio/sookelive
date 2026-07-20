import { setupServer } from 'msw/node'

export const AZURACAST_PLAYLISTS_URL = 'https://azuracast.test/api/station/test-station/playlists'

// No default handlers - each test mocks exactly the Azuracast responses it
// needs via server.use(), and onUnhandledRequest: 'error' (set in
// setupFiles.ts) means an un-mocked call fails the test instead of
// silently doing nothing or hitting a real host.
export const server = setupServer()
