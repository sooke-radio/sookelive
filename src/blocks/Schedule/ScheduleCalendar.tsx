'use client'

import React from 'react'
import { weekdays } from '@/schedule/schedule-common'
import { Button } from '@/components/ui/button'
import { openPrintableCalendar } from './printSchedule'
import { buildCalendarGrid, formatHour } from './scheduleGrid'
import { ScheduleByDay } from './types'

interface Props {
  scheduleByDay: ScheduleByDay
}

const PX_PER_MIN = 1
const MIN_BLOCK_HEIGHT = 28

export const ScheduleCalendar: React.FC<Props> = ({ scheduleByDay }) => {
  const { rangeStart, totalMinutes, hourMarks, positionedByDay } = buildCalendarGrid(
    scheduleByDay,
    PX_PER_MIN,
    MIN_BLOCK_HEIGHT,
  )

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: '4rem repeat(7, 1fr)' }}>
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
                  className={
                    entry.shuffle
                      ? 'absolute left-1 right-1 rounded bg-white/5 border border-white/15 px-2 py-1 text-xs font-medium text-white/60 overflow-hidden hover:bg-white/10'
                      : 'absolute left-1 right-1 rounded bg-white/10 border border-white/30 px-2 py-1 text-xs font-medium text-white overflow-hidden hover:bg-white/20'
                  }
                  style={{ top: entry.top, height: entry.height, zIndex: entry.shuffle ? 0 : 10 }}
                >
                  {entry.playlistName}
                </a>
              ))
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <Button type="button" size="sm" variant="outline" onClick={() => openPrintableCalendar(scheduleByDay)}>
          Print
        </Button>
      </div>
    </div>
  )
}
