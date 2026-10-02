import { describe, expect, it, vi } from 'vitest'
import type { PayloadRequest } from 'payload'
import type { User } from '@/payload-types'

import {
  getAssignedShowIds,
  getHostId,
  isAdminOrEpisodeOfAssignedShow,
  isAdminOrShowHost,
} from './assignedShows'

const admin = { id: '1', roles: ['admin'] } as Partial<User>
const hostWithoutProfile = { id: '2', roles: ['host'] } as Partial<User>
const host = { id: '3', roles: ['host'], host: 'host-doc-1' } as unknown as Partial<User>
const hostWithPopulatedProfile = {
  id: '4',
  roles: ['host'],
  host: { id: 'host-doc-2' },
} as unknown as Partial<User>

const makeReq = (user: Partial<User> | null, showIds: string[] = []): PayloadRequest => {
  const find = vi.fn().mockResolvedValue({ docs: showIds.map((id) => ({ id })) })
  return {
    user,
    context: {},
    payload: { find },
  } as unknown as PayloadRequest
}

describe('getHostId', () => {
  it('returns undefined when the user has no host', () => {
    expect(getHostId(hostWithoutProfile as PayloadRequest['user'])).toBeUndefined()
    expect(getHostId(null)).toBeUndefined()
  })

  it('returns the id directly when host is an unpopulated relationship', () => {
    expect(getHostId(host as PayloadRequest['user'])).toBe('host-doc-1')
  })

  it('returns the id from a populated host relationship', () => {
    expect(getHostId(hostWithPopulatedProfile as PayloadRequest['user'])).toBe('host-doc-2')
  })
})

describe('isAdminOrShowHost', () => {
  it('grants an admin unrestricted access', () => {
    expect(isAdminOrShowHost({ req: { user: admin } } as any)).toBe(true)
  })

  it('denies a host with no linked host profile', () => {
    expect(isAdminOrShowHost({ req: { user: hostWithoutProfile } } as any)).toBe(false)
  })

  it('scopes a host to shows where they are listed', () => {
    expect(isAdminOrShowHost({ req: { user: host } } as any)).toEqual({
      hosts: { in: ['host-doc-1'] },
    })
  })

  it('denies anonymous users', () => {
    expect(isAdminOrShowHost({ req: { user: null } } as any)).toBe(false)
  })
})

describe('getAssignedShowIds', () => {
  it('returns an empty array without querying when the user has no host', async () => {
    const req = makeReq(hostWithoutProfile)
    await expect(getAssignedShowIds(req)).resolves.toEqual([])
    expect(req.payload.find).not.toHaveBeenCalled()
  })

  it('queries shows assigned to the host and caches the result on req.context', async () => {
    const req = makeReq(host, ['show-1', 'show-2'])
    const ids = await getAssignedShowIds(req)
    expect(ids).toEqual(['show-1', 'show-2'])
    expect(req.payload.find).toHaveBeenCalledTimes(1)
    expect(req.context.assignedShowIds).toEqual(['show-1', 'show-2'])
  })

  it('memoizes on req.context so a second call does not re-query', async () => {
    const req = makeReq(host, ['show-1'])
    await getAssignedShowIds(req)
    await getAssignedShowIds(req)
    expect(req.payload.find).toHaveBeenCalledTimes(1)
  })
})

describe('isAdminOrEpisodeOfAssignedShow', () => {
  it('grants an admin unrestricted access', async () => {
    const req = makeReq(admin)
    await expect(isAdminOrEpisodeOfAssignedShow({ req } as any)).resolves.toBe(true)
  })

  it('denies anonymous users', async () => {
    const req = makeReq(null)
    await expect(isAdminOrEpisodeOfAssignedShow({ req } as any)).resolves.toBe(false)
  })

  it('scopes a host to their assigned shows plus their own showless drafts', async () => {
    const req = makeReq(host, ['show-1'])
    await expect(isAdminOrEpisodeOfAssignedShow({ req } as any)).resolves.toEqual({
      or: [
        { and: [{ show: { exists: false } }, { createdBy: { equals: host.id } }] },
        { show: { in: ['show-1'] } },
      ],
    })
  })

  it('omits the show-in clause when the host has no assigned shows', async () => {
    const req = makeReq(host, [])
    await expect(isAdminOrEpisodeOfAssignedShow({ req } as any)).resolves.toEqual({
      or: [{ and: [{ show: { exists: false } }, { createdBy: { equals: host.id } }] }],
    })
  })
})
