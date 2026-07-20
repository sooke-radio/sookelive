import { describe, expect, it } from 'vitest'
import { toKebabCase } from './toKebabCase'

describe('toKebabCase', () => {
  it('converts camelCase to kebab-case', () => {
    expect(toKebabCase('camelCaseString')).toBe('camel-case-string')
  })

  it('converts spaces to hyphens', () => {
    expect(toKebabCase('a string with spaces')).toBe('a-string-with-spaces')
  })

  it('collapses runs of whitespace to a single hyphen', () => {
    expect(toKebabCase('a   b')).toBe('a-b')
  })

  it('lowercases the result', () => {
    expect(toKebabCase('HelloWorld')).toBe('hello-world')
  })

  it('leaves an already-kebab string unchanged', () => {
    expect(toKebabCase('already-kebab')).toBe('already-kebab')
  })

  it('returns undefined for undefined input rather than throwing', () => {
    expect(toKebabCase(undefined as unknown as string)).toBeUndefined()
  })
})
