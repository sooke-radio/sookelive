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
    startTime: number,
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
        day = day % 7; // normalize day to be in range 0-6, with sunday 7 = 0

        if (!scheduleByDay[day]) {
          return;
        }
        scheduleByDay[day].push({
          startTime: item.start_time,
          playlistName: playlist.name
        });
      });
    });
  });
  
  // Sort schedule items by start time for each day
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[Number(day)].sort((a, b) => a.startTime - b.startTime);
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
              <div key={day} className="">
                <div className="font-medium inline-block min-w-32 align-top">{weekdays[Number(day)]}</div>
                {items.length > 1 ? (
                    <div className="inline-block align-top">
                        {items.map((item, itemIndex) => (
                            <div key={itemIndex}>
                                {formatTime(item.startTime)}
                                {item.playlistName && <span className="font-medium"> - {item.playlistName}</span>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <span className="inline-block">
                        {formatTime(items[0].startTime)}
                        {items[0].playlistName && <span className="font-medium"> - {items[0].playlistName}</span>}
                    </span>
                )}
              </div>
            )
          ))}
        </div>

    </div>
  )
}
