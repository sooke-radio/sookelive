import { describe, expect, it } from 'vitest'
import { formatTime, isScheduleItemActive, weekdays } from './schedule-common'

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

describe('isScheduleItemActive', () => {
  const referenceDate = new Date(2026, 5, 15) // 2026-06-15

  it('is active with no start_date or end_date (a permanently recurring slot)', () => {
    expect(isScheduleItemActive({ start_date: null, end_date: null }, referenceDate)).toBe(true)
  })

  it('is active when the reference date is within the start/end range', () => {
    expect(
      isScheduleItemActive({ start_date: '2026-06-01', end_date: '2026-06-30' }, referenceDate),
    ).toBe(true)
  })

  it('is active on the exact start_date and end_date boundaries', () => {
    expect(
      isScheduleItemActive({ start_date: '2026-06-15', end_date: '2026-06-15' }, referenceDate),
    ).toBe(true)
  })

  it('is inactive before start_date', () => {
    expect(isScheduleItemActive({ start_date: '2026-07-01', end_date: null }, referenceDate)).toBe(
      false,
    )
  })

  it('is inactive after end_date', () => {
    expect(isScheduleItemActive({ start_date: null, end_date: '2026-06-01' }, referenceDate)).toBe(
      false,
    )
  })

  it('is active with only a start_date in the past', () => {
    expect(isScheduleItemActive({ start_date: '2026-01-01', end_date: null }, referenceDate)).toBe(
      true,
    )
  })

  it('is active with only an end_date in the future', () => {
    expect(isScheduleItemActive({ start_date: null, end_date: '2026-12-31' }, referenceDate)).toBe(
      true,
    )
  })
})
