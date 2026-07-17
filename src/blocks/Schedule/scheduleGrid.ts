import { weekdays, timeToMinutes } from '@/schedule/schedule-common'
import { ScheduleByDay, ScheduleEntry } from './types'

export const HOUR = 60
const DEFAULT_DURATION = 60

export interface PositionedEntry extends ScheduleEntry {
  top: number
  height: number
}

export interface CalendarGrid {
  rangeStart: number
  totalMinutes: number
  hourMarks: number[]
  positionedByDay: Record<number, PositionedEntry[]>
}

// Entries with no end time (open-ended slots) default to a 1 hour block;
// entries that cross midnight are treated as ending the next day.
const getDurationMinutes = (entry: ScheduleEntry): number => {
  const start = timeToMinutes(entry.startTime)
  let end = entry.endTime ? timeToMinutes(entry.endTime) : start + DEFAULT_DURATION
  if (end <= start) end += 24 * HOUR
  return end - start
}

export const formatHour = (minutesSinceMidnight: number): string => {
  const hour24 = Math.floor(minutesSinceMidnight / HOUR) % 24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12} ${period}`
}

export const buildCalendarGrid = (
  scheduleByDay: ScheduleByDay,
  pxPerMin: number,
  minBlockHeight: number,
): CalendarGrid => {
  const allEntries = Object.values(scheduleByDay).flat()

  const starts = allEntries.map((entry) => timeToMinutes(entry.startTime))
  const ends = allEntries.map((entry) => timeToMinutes(entry.startTime) + getDurationMinutes(entry))

  const rangeStart = allEntries.length
    ? Math.max(0, Math.floor(Math.min(...starts) / HOUR) * HOUR)
    : 8 * HOUR
  const rangeEnd = allEntries.length
    ? Math.min(24 * HOUR, Math.ceil(Math.max(...ends) / HOUR) * HOUR)
    : 20 * HOUR

  const totalMinutes = Math.max(HOUR, rangeEnd - rangeStart)

  const hourMarks: number[] = []
  for (let minutes = rangeStart; minutes <= rangeEnd; minutes += HOUR) hourMarks.push(minutes)

  const positionedByDay: Record<number, PositionedEntry[]> = {}
  weekdays.forEach((_, dayIndex) => {
    positionedByDay[dayIndex] = (scheduleByDay[dayIndex] || []).map((entry) => {
      const start = timeToMinutes(entry.startTime) - rangeStart
      const duration = getDurationMinutes(entry)
      const height = Math.min(duration, totalMinutes - start) * pxPerMin

      return { ...entry, top: start * pxPerMin, height: Math.max(minBlockHeight, height) }
    })
  })

  return { rangeStart, totalMinutes, hourMarks, positionedByDay }
}
