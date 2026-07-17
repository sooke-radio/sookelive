import React from 'react'
import { weekdays, formatTime } from '@/schedule/schedule-common'
import { Card } from '@/components/ui/card'
import { ScheduleByDay } from './types'

interface Props {
  scheduleByDay: ScheduleByDay
}

export const ScheduleList: React.FC<Props> = ({ scheduleByDay }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {weekdays.map((day, dayIndex) => {
        const daySchedule = scheduleByDay[dayIndex]

        return (
          <Card key={dayIndex} className="p-4">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">{day}</h3>

            {daySchedule.length > 0 ? (
              <div className="space-y-4">
                {daySchedule.map((entry, entryIndex) => (
                  <div
                    key={entryIndex}
                    className={
                      entry.shuffle
                        ? 'space-y-1 -mx-2 px-2 py-1 rounded bg-black/5 dark:bg-white/5'
                        : 'space-y-1'
                    }
                  >
                    <div className="flex border-b border-1 border-dotted">
                      <span className={`text-sm min-w-48${entry.shuffle ? ' text-muted-foreground' : ''}`}>
                        {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                      </span>
                      <div className={`text-sm font-bold${entry.shuffle ? ' text-muted-foreground' : ''}`}>
                        <a href={`/shows/${entry.slug}`}>{entry.playlistName}</a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No shows scheduled</div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
