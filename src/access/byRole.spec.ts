import { describe, expect, it } from 'vitest'
import type { AccessArgs } from 'payload'
import type { User } from '@/payload-types'

import { isAdmin, isAdminField, isAdminOrHost, isAdminOrSelf } from './byRole'

const args = (user: Partial<User> | null): AccessArgs<User> =>
  ({ req: { user } }) as unknown as AccessArgs<User>

const admin = { id: '1', roles: ['admin'] } as Partial<User>
const host = { id: '2', roles: ['host'] } as Partial<User>

describe('isAdmin', () => {
  it('is true for an admin user', () => {
    expect(isAdmin(args(admin))).toBe(true)
  })

  it('is false for a host user or anonymous', () => {
    expect(isAdmin(args(host))).toBe(false)
    expect(isAdmin(args(null))).toBe(false)
  })
})

describe('isAdminField', () => {
  it('is true only for an admin user', () => {
    expect(isAdminField(args(admin))).toBe(true)
    expect(isAdminField(args(host))).toBe(false)
  })
})

describe('isAdminOrSelf', () => {
  it('grants an admin unrestricted access', () => {
    expect(isAdminOrSelf(args(admin))).toBe(true)
  })

  it('scopes a non-admin to their own id', () => {
    expect(isAdminOrSelf(args(host))).toEqual({ id: { equals: host.id } })
  })

  it('denies anonymous users', () => {
    expect(isAdminOrSelf(args(null))).toBe(false)
  })
})

describe('isAdminOrHost', () => {
  it('is true for admins and hosts', () => {
    expect(isAdminOrHost(args(admin))).toBe(true)
    expect(isAdminOrHost(args(host))).toBe(true)
  })

  it('is false for a role-less user or anonymous', () => {
    expect(isAdminOrHost(args({ id: '3', roles: [] } as Partial<User>))).toBe(false)
    expect(isAdminOrHost(args(null))).toBe(false)
  })
})
