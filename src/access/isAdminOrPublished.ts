import type { Access } from 'payload'

import { isAdminUser } from './roles'

// Like authenticatedOrPublished, but drafts are only visible to admins now
// that non-admin (host) users can also authenticate into /admin.
export const isAdminOrPublished: Access = ({ req: { user } }) => {
  if (isAdminUser(user)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
