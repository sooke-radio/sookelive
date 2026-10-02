import type { CollectionBeforeValidateHook } from 'payload'

import { Forbidden } from 'payload'

import { getAssignedShowIds, getHostId } from '@/access/assignedShows'
import { isAdminUser } from '@/access/roles'

// A data-dependent create access function would hide the admin "Create"
// button entirely (Payload probes create access without `data` for UI
// buttons), so ownership is enforced here instead. Also blocks a host
// re-pointing an existing episode at a show they don't manage.
export const enforceShowOwnership: CollectionBeforeValidateHook = async ({ data, req }) => {
  const { user } = req
  if (isAdminUser(user)) return data

  const hostId = getHostId(user)
  if (!hostId) throw new Forbidden(req.t)

  const showId = typeof data?.show === 'object' ? data.show?.id : data?.show
  if (!showId) return data

  const showIds = await getAssignedShowIds(req)
  if (!showIds.map(String).includes(String(showId))) {
    throw new Forbidden(req.t)
  }

  return data
}
