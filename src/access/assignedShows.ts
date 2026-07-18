import type { Access, PayloadRequest, Where } from 'payload'

import { isAdminUser } from './roles'

export const getHostId = (user: PayloadRequest['user']): string | undefined => {
  if (!user?.host) return undefined
  return typeof user.host === 'object' ? user.host.id : user.host
}

// Memoized per-request: Episodes access functions call this once for read
// and once more for the create ownership hook, and we don't want two queries.
export const getAssignedShowIds = async (req: PayloadRequest): Promise<string[]> => {
  const hostId = getHostId(req.user)
  if (!hostId) return []

  if (Array.isArray(req.context.assignedShowIds)) {
    return req.context.assignedShowIds as string[]
  }

  const { docs } = await req.payload.find({
    collection: 'shows',
    where: { hosts: { in: [hostId] } },
    depth: 0,
    limit: 0,
    overrideAccess: true,
    req,
  })

  const ids = docs.map((doc) => doc.id)
  req.context.assignedShowIds = ids
  return ids
}

export const isAdminOrShowHost: Access = ({ req: { user } }) => {
  if (!user) return false
  if (isAdminUser(user)) return true

  const hostId = getHostId(user)
  if (!hostId) return false

  return {
    hosts: {
      in: [hostId],
    },
  }
}

// Pre-queried show ids (not a nested `show.hosts` path) so this stays
// deterministic against drafts/versions queries. Also lets a host
// update/delete their own still-showless draft (see the `createdBy` field on
// Episodes) - otherwise they'd have no way to add a show to (or discard) an
// episode autosaved before they picked one.
export const isAdminOrEpisodeOfAssignedShow: Access = async ({ req }) => {
  const { user } = req
  if (!user) return false
  if (isAdminUser(user)) return true

  const showIds = await getAssignedShowIds(req)

  const conditions: Where[] = [
    { and: [{ show: { exists: false } }, { createdBy: { equals: user.id } }] },
  ]
  if (showIds.length > 0) {
    conditions.push({ show: { in: showIds } })
  }

  return { or: conditions }
}
