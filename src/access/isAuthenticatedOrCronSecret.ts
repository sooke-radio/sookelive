import type { PayloadRequest } from 'payload'

// A logged-in user, or a request bearing the CRON_SECRET bearer token.
// Shared by the jobs `run` access check (src/payload.config.ts) and the
// /api/playlists/sync endpoint (src/collections/Playlists/index.ts) -
// previously duplicated independently in both places. Requires CRON_SECRET
// to be a non-empty string so an unset secret can't match an
// "Authorization: Bearer undefined" request.
export const isAuthenticatedOrCronSecret = (req: PayloadRequest): boolean => {
  if (req.user) return true

  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  return req.headers.get('authorization') === `Bearer ${cronSecret}`
}
