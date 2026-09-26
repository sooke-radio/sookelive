import { describe, expect, it } from 'vitest'
import { hasRole, isAdminUser, ROLES } from './roles'

describe('hasRole', () => {
  it('returns true when the user has the role', () => {
    expect(hasRole({ roles: ['admin'] }, ROLES.admin)).toBe(true)
  })

  it('returns false when the user does not have the role', () => {
    expect(hasRole({ roles: ['host'] }, ROLES.admin)).toBe(false)
  })

  it('returns false when roles is missing', () => {
    expect(hasRole({}, ROLES.admin)).toBe(false)
  })

  it('returns false when roles is not an array', () => {
    expect(hasRole({ roles: 'admin' }, ROLES.admin)).toBe(false)
  })

  it('returns false for null/undefined users', () => {
    expect(hasRole(null, ROLES.admin)).toBe(false)
    expect(hasRole(undefined, ROLES.admin)).toBe(false)
  })

  it('supports multi-role users', () => {
    expect(hasRole({ roles: ['host', 'admin'] }, ROLES.host)).toBe(true)
    expect(hasRole({ roles: ['host', 'admin'] }, ROLES.admin)).toBe(true)
  })
})

describe('isAdminUser', () => {
  it('returns true only for users with the admin role', () => {
    expect(isAdminUser({ roles: ['admin'] })).toBe(true)
    expect(isAdminUser({ roles: ['host'] })).toBe(false)
    expect(isAdminUser(null)).toBe(false)
  })
})
