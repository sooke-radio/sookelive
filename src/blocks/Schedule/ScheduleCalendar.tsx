import React from 'react'
import { weekdays, timeToMinutes } from '@/schedule/schedule-common'
import { ScheduleByDay, ScheduleEntry } from './types'

interface Props {
  scheduleByDay: ScheduleByDay
}

const PX_PER_MIN = 1
const MIN_BLOCK_HEIGHT = 28
const DEFAULT_DURATION = 60
const HOUR = 60

interface PositionedEntry extends ScheduleEntry {
  top: number
  height: number
}

// Entries with no end time (open-ended slots) default to a 1 hour block;
// entries that cross midnight are treated as ending the next day.
const getDurationMinutes = (entry: ScheduleEntry): number => {
  const start = timeToMinutes(entry.startTime)
  let end = entry.endTime ? timeToMinutes(entry.endTime) : start + DEFAULT_DURATION
  if (end <= start) end += 24 * HOUR
  return end - start
}

const formatHour = (minutesSinceMidnight: number): string => {
  const hour24 = Math.floor(minutesSinceMidnight / HOUR) % 24
  const period = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 % 12 || 12
  return `${hour12} ${period}`
}

export const ScheduleCalendar: React.FC<Props> = ({ scheduleByDay }) => {
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
      const height = Math.min(duration, totalMinutes - start) * PX_PER_MIN

      return { ...entry, top: start * PX_PER_MIN, height: Math.max(MIN_BLOCK_HEIGHT, height) }
    })
  })

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px] grid" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
        <div />
        {weekdays.map((day) => (
          <div key={day} className="text-sm font-semibold text-center pb-2 border-b">
            {day}
          </div>
        ))}

        <div className="relative" style={{ height: totalMinutes * PX_PER_MIN }}>
          {hourMarks.map((minutes) => (
            <div
              key={minutes}
              className="absolute right-2 text-xs text-gray-500"
              style={{ top: (minutes - rangeStart) * PX_PER_MIN }}
            >
              {formatHour(minutes)}
            </div>
          ))}
        </div>

        {weekdays.map((_, dayIndex) => (
          <div
            key={dayIndex}
            className="relative border-l border-white/10 bg-black dark:bg-card"
            style={{ height: totalMinutes * PX_PER_MIN }}
          >
            {hourMarks.map((minutes) => (
              <div
                key={minutes}
                className="absolute left-0 right-0 border-t border-dotted border-white/10"
                style={{ top: (minutes - rangeStart) * PX_PER_MIN }}
              />
            ))}

            {positionedByDay[dayIndex].length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic text-xs">
                No shows
              </div>
            ) : (
              positionedByDay[dayIndex].map((entry, entryIndex) => (
                <a
                  key={entryIndex}
                  href={`/shows/${entry.slug}`}
                  className="absolute left-1 right-1 rounded bg-white/10 border border-white/30 px-2 py-1 text-xs font-medium text-white overflow-hidden hover:bg-white/20"
                  style={{ top: entry.top, height: entry.height }}
                >
                  {entry.playlistName}
                </a>
              ))
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
