import type { Where } from 'payload'

/**
 * Episodes whose `dateAired` has passed. `dateAired` may be in the future
 * ("or will air"), and public episode listings should only show aired ones.
 * A function (not a constant) so "now" is evaluated on every render.
 */
export const airedEpisodesWhere = (): Where => ({
  dateAired: { less_than_equal: new Date().toISOString() },
})
