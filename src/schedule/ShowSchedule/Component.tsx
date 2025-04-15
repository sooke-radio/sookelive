import React from 'react'
import { ScheduleItem, weekdays, formatTime } from '@/schedule/schedule-common'

interface Props {
  playlists: Array<{
    id: string
    name?: string
    schedule_items?: ScheduleItem[]
  }>
}

export const ShowScheduleBlock = ({ playlists }: Props) => {
  // Create a map to organize schedule items by day
  const scheduleByDay: Record<number, Array<{
    startTime: string,
    endTime: string,
    playlistName?: string
  }>> = {};
  
  // Initialize the map with empty arrays for each day
  weekdays.forEach((_, index) => {
    scheduleByDay[index] = [];
  });
  
  // Merge schedules from all playlists
  playlists.forEach(playlist => {
    const scheduled = playlist?.schedule_items || [];
    
    scheduled.forEach(item => {
      item.days.forEach(day => {
        scheduleByDay[day].push({
          startTime: formatTime(item.start_time),
          endTime: formatTime(item.end_time),
          playlistName: playlist.name
        });
      });
    });
  });
  
  // Sort schedule items by start time for each day
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[Number(day)].sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );
  });
  
  // Check if there are any scheduled items
  const hasSchedule = Object.values(scheduleByDay).some(items => items.length > 0);
  
  if (!hasSchedule) {
    return null;
  }

  return (
    <div className="container mt-8">
      <div className="max-w-[48rem] mx-auto shadow-sm">
          <h3 className="text-lg font-semibold mb-2 border-b border-1">Schedule</h3>
          
          {Object.entries(scheduleByDay).map(([day, items]) => (
            items.length > 0 && (
              <div key={day} className="mb-4">
                <div className="font-medium inline-block min-w-32">{weekdays[Number(day)]}</div>
                {items.map((item, itemIndex) => (
                    <>
                        <span key={itemIndex} className="inline-block">{item.startTime} - {item.endTime}</span>
                        {itemIndex < items.length - 1 && <span>, </span>}
                    </>
                ))}
              </div>
            )
          ))}
        </div>

    </div>
  )
}
