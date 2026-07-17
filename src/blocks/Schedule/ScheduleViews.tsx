'use client'

import React, { useState, useSyncExternalStore } from 'react'
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

// Matches the Tailwind `lg` breakpoint (see tailwind.config.mjs)
const DESKTOP_QUERY = '(min-width: 1024px)'

const subscribeToDesktopQuery = (callback: () => void) => {
  const mql = window.matchMedia(DESKTOP_QUERY)
  mql.addEventListener('change', callback)
  return () => mql.removeEventListener('change', callback)
}

const getIsDesktop = () => window.matchMedia(DESKTOP_QUERY).matches
const getIsDesktopServerSnapshot = () => false

export const ScheduleViews: React.FC<Props> = ({ scheduleByDay, title, description }) => {
  const isDesktop = useSyncExternalStore(
    subscribeToDesktopQuery,
    getIsDesktop,
    getIsDesktopServerSnapshot,
  )
  const [manualView, setManualView] = useState<View | null>(null)
  const view = manualView ?? (isDesktop ? 'calendar' : 'list')

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
            onClick={() => setManualView('list')}
          >
            List
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'calendar' ? 'default' : 'outline'}
            onClick={() => setManualView('calendar')}
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
