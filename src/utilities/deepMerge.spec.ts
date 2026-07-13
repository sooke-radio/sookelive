import { describe, expect, it } from 'vitest'
import deepMerge, { isObject } from './deepMerge'

describe('isObject', () => {
  it('returns true for plain objects', () => {
    expect(isObject({})).toBe(true)
    expect(isObject({ a: 1 })).toBe(true)
  })

  it('returns false for arrays, null, and primitives', () => {
    expect(isObject([])).toBe(false)
    expect(isObject(null)).toBeFalsy()
    expect(isObject('string')).toBe(false)
    expect(isObject(1)).toBe(false)
    expect(isObject(undefined)).toBeFalsy()
  })
})

describe('deepMerge', () => {
  it('merges top-level keys, with source overriding target', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 3, c: 4 })).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('recursively merges nested objects present on both sides', () => {
    const target = { a: { x: 1, y: 2 } }
    const source = { a: { y: 3, z: 4 } }
    expect(deepMerge(target, source)).toEqual({ a: { x: 1, y: 3, z: 4 } })
  })

  it('assigns nested objects wholesale when the key is missing on target', () => {
    const target = { a: 1 }
    const source = { b: { x: 1 } }
    expect(deepMerge(target, source)).toEqual({ a: 1, b: { x: 1 } })
  })

  it('overwrites arrays rather than merging them', () => {
    const target = { a: [1, 2, 3] }
    const source = { a: [4, 5] }
    expect(deepMerge(target, source)).toEqual({ a: [4, 5] })
  })

  it('does not mutate the original target object', () => {
    const target = { a: { x: 1 } }
    const source = { a: { y: 2 } }
    deepMerge(target, source)
    expect(target).toEqual({ a: { x: 1 } })
  })

  it('returns a shallow copy of target when source is not an object', () => {
    const target = { a: 1 }
    expect(deepMerge(target, null)).toEqual({ a: 1 })
  })
})
