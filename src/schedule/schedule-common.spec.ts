import { describe, expect, it } from 'vitest'
import { formatTime, weekdays } from './schedule-common'

describe('weekdays', () => {
  it('has seven days starting with Sunday', () => {
    expect(weekdays).toHaveLength(7)
    expect(weekdays[0]).toBe('Sunday')
    expect(weekdays[6]).toBe('Saturday')
  })
})

describe('formatTime', () => {
  it('returns an empty string for falsy input (including literal midnight, 0)', () => {
    // Note: this means true midnight (0000) is indistinguishable from "no
    // time set" - a pre-existing limitation of the `!time` guard, not
    // something this test suite changes.
    expect(formatTime(0)).toBe('')
  })

  it('formats a morning time', () => {
    expect(formatTime(930)).toBe('9:30 AM')
  })

  it('formats noon (1200) as 12:00 PM', () => {
    expect(formatTime(1200)).toBe('12:00 PM')
  })

  it('formats an afternoon time', () => {
    expect(formatTime(1630)).toBe('4:30 PM')
  })

  it('formats a time just before midnight', () => {
    expect(formatTime(2359)).toBe('11:59 PM')
  })

  it('pads single-digit hour values in the raw time number', () => {
    // 5 -> "0005" -> 00:05 -> 12:05 AM
    expect(formatTime(5)).toBe('12:05 AM')
  })
})
