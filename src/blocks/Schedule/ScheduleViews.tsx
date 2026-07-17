'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScheduleList } from './ScheduleList'
import { ScheduleCalendar } from './ScheduleCalendar'
import { ScheduleByDay } from './types'

interface Props {
  scheduleByDay: ScheduleByDay
  title?: string
  description?: string
}

type View = 'list' | 'calendar'

export const ScheduleViews: React.FC<Props> = ({ scheduleByDay, title, description }) => {
  const [view, setView] = useState<View>('list')

  return (
    <div className="container mt-8">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          {title && <h2 className="text-2xl font-bold">{title}</h2>}
          {description && <p className="mt-2">{description}</p>}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={view === 'list' ? 'default' : 'outline'}
            onClick={() => setView('list')}
          >
            List
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setView('calendar')}
          >
            Calendar
          </Button>
        </div>
      </div>

      {view === 'list' ? (
        <ScheduleList scheduleByDay={scheduleByDay} />
      ) : (
        <ScheduleCalendar scheduleByDay={scheduleByDay} />
      )}
    </div>
  )
}
