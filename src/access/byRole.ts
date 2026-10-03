import type { Access, AccessArgs, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

import { hasRole, isAdminUser, ROLES } from './roles'

export const isAdmin: Access<User> = ({ req: { user } }) => {
  return isAdminUser(user)
}

export const isAdminField: FieldAccess<User> = ({ req: { user } }) => {
  return isAdminUser(user)
}

export const isAdminOrSelf: Access<User> = ({ req: { user } }) => {
  if (isAdminUser(user)) return true
  if (!user) return false

  return {
    id: {
      equals: user.id,
    },
  }
}

// Deliberately boolean-only (not `Access<User>`) so this also satisfies
// `access.admin`, which rejects a Where-returning function.
export const isAdminOrHost = ({ req: { user } }: AccessArgs<User>): boolean => {
  if (!user) return false

  return isAdminUser(user) || hasRole(user, ROLES.host)
}
