import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

import { CMSLink } from '@/components/Link'
import { Playlist } from '@/payload-types'
import { Container } from 'lucide-react'

interface Props {
  playlist: Playlist
}

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const formatTime = (time: string): string => {
  // if (!time || time.length !== 4) return time;
  
  // Extract hours and minutes
  const hours = parseInt(time.substring(0, 2), 10);
  const minutes = time.substring(2, 4);
  
  // Determine AM/PM
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12; // 0 should be displayed as 12
  
  return `${hour12}:${minutes} ${period}`;
}

export const ScheduleBlock = ({ playlist }: Props) => {
  
  const scheduled = playlist?.schedule_items || []

  return (
    <div className="container">
      <div className="grid grid-cols-1 gap-8">
        {scheduled?.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 shadow-sm">
            {item.days.map((day, index) => (
              <div key={index}>
                {weekdays[day]} {formatTime(item.start_time)} - {formatTime(item.end_time)}
              </div>
            ))}
            {item.description && (
              <div className="mt-2 text-sm">{item.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>

  )
}