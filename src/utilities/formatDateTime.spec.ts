import { describe, expect, it } from 'vitest'
import { formatDateTime } from './formatDateTime'

// formatDateTime reads local-time getMonth/getDate/getFullYear, so expected
// values are derived the same way rather than hardcoded, to stay correct
// regardless of the timezone the test runner executes in.
const expectedFor = (timestamp: string) => {
  const date = new Date(timestamp)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const yyyy = date.getFullYear()
  return `${mm}/${dd}/${yyyy}`
}

describe('formatDateTime', () => {
  it('formats a timestamp as MM/DD/YYYY', () => {
    const timestamp = '2026-03-05T12:00:00.000Z'
    expect(formatDateTime(timestamp)).toBe(expectedFor(timestamp))
  })

  it('pads single-digit months and days', () => {
    const timestamp = '2026-01-02T12:00:00.000Z'
    const result = formatDateTime(timestamp)
    expect(result).toBe(expectedFor(timestamp))
    expect(result.split('/')[0]).toHaveLength(2)
    expect(result.split('/')[1]).toHaveLength(2)
  })

  it('falls back to the current date when timestamp is falsy', () => {
    expect(formatDateTime('')).toBe(expectedFor(new Date().toISOString()))
  })
})
