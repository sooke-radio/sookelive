import React from 'react'
import { weekdays, formatTime } from '@/schedule/schedule-common'
import { Show } from '@/payload-types'
import { Card } from '@/components/ui/card'

interface Props {
  shows: Show[]
}

interface ScheduledSlot {
  showId: string
  showName: string
  playlistName: string
  startTime: number
  endTime: number
  days: number[]
}

export const FullScheduleBlock = ({ shows }: Props) => {
  // Create a schedule organized by day
  const scheduleByDay: Record<number, ScheduledSlot[]> = {}
  
  // Initialize empty arrays for each day of the week
  weekdays.forEach((_, index) => {
    scheduleByDay[index] = []
  })
  
  // Populate the schedule by day and show
  shows.forEach(show => {
    // Skip shows without a stream playlist
    if (!show.stream_playlist) return
    
    const playlist = typeof show.stream_playlist === 'string' 
      ? null // We don't have the actual playlist data if it's just an ID
      : show.stream_playlist
    
    if (!playlist || !playlist.schedule_items) return
    
    // Add each scheduled slot to the appropriate days
    playlist.schedule_items.forEach(item => {
      item.days.forEach(day => {
        scheduleByDay[day].push({
          showId: show.id,
          showName: show.title,
          playlistName: playlist.name,
          startTime: item.start_time,
          endTime: item.end_time,
          days: item.days
        })
      })
    })
  })
  
  // Sort each day's schedule by start time
  Object.keys(scheduleByDay).forEach(day => {
    scheduleByDay[Number(day)].sort((a, b) => a.startTime - b.startTime)
  })
  
  return (
    <div className="container mt-8">
      <h2 className="text-2xl font-bold mb-6">Weekly Schedule</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {weekdays.map((day, dayIndex) => (
          <Card key={dayIndex} className="p-4">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">{day}</h3>
            
            {scheduleByDay[dayIndex].length > 0 ? (
              <div className="space-y-4">
                {scheduleByDay[dayIndex].map((slot, slotIndex) => (
                  <div key={slotIndex} className="space-y-1">
                    <div className="flex justify-between">
                      <h4 className="font-medium">{slot.showName}</h4>
                      <div className="text-gray-600">
                        {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 pl-2">
                      {slot.playlistName}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 italic">No shows scheduled</div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
