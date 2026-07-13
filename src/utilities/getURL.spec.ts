import { afterEach, describe, expect, it } from 'vitest'
import { getClientSideURL, getServerSideURL } from './getURL'

const ENV_KEYS = ['NEXT_PUBLIC_SERVER_URL', 'VERCEL_PROJECT_PRODUCTION_URL'] as const

const unsetEnv = (key: string) => Reflect.deleteProperty(process.env, key)

describe('getURL', () => {
  const original = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) unsetEnv(key)
      else process.env[key] = original[key]
    }
  })

  describe('getServerSideURL', () => {
    it('returns NEXT_PUBLIC_SERVER_URL when set', () => {
      process.env.NEXT_PUBLIC_SERVER_URL = 'https://sooke.live'
      expect(getServerSideURL()).toBe('https://sooke.live')
    })

    it('falls back to the Vercel production URL when unset', () => {
      unsetEnv('NEXT_PUBLIC_SERVER_URL')
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'sookelive.vercel.app'
      expect(getServerSideURL()).toBe('https://sookelive.vercel.app')
    })

    it('returns an empty string when neither is set', () => {
      unsetEnv('NEXT_PUBLIC_SERVER_URL')
      unsetEnv('VERCEL_PROJECT_PRODUCTION_URL')
      expect(getServerSideURL()).toBe('')
    })
  })

  describe('getClientSideURL (no DOM, as in this node test environment)', () => {
    it('falls back to the Vercel production URL when set', () => {
      process.env.VERCEL_PROJECT_PRODUCTION_URL = 'sookelive.vercel.app'
      expect(getClientSideURL()).toBe('https://sookelive.vercel.app')
    })

    it('falls back to NEXT_PUBLIC_SERVER_URL when Vercel env is unset', () => {
      unsetEnv('VERCEL_PROJECT_PRODUCTION_URL')
      process.env.NEXT_PUBLIC_SERVER_URL = 'https://sooke.live'
      expect(getClientSideURL()).toBe('https://sooke.live')
    })

    it('returns an empty string when nothing is set', () => {
      unsetEnv('VERCEL_PROJECT_PRODUCTION_URL')
      unsetEnv('NEXT_PUBLIC_SERVER_URL')
      expect(getClientSideURL()).toBe('')
    })
  })
})
