import React from 'react'
import { weekdays, formatTime } from '@/schedule/schedule-common'
import { Show } from '@/payload-types'
import { Card } from '@/components/ui/card'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { unstable_cache } from 'next/cache'

interface Props {
  shows?: Show[]
  allShows?: boolean
  title?: string
  description?: string
}

interface ScheduleEntry {
  showName: string
  playlistName: string
  startTime: number
  endTime: number
  slug: string
}

export const ScheduleBlock: React.FC<Props> = async ({
  shows = [],
  allShows = false,
  title,
  description = '',
}) => {
  const payload = await getPayload({ config: configPromise })
  const getShows = await unstable_cache(
    async () => {
      if (allShows || shows.length < 1) {
        const getShows = await payload.find({
          collection: 'shows',
          draft: false,
          limit: 1000,
          depth: 3,
          overrideAccess: false,
          pagination: false,
          select: {
            slug: true,
            stream_playlist: true,
            title: true,
          },
        })

        shows = ((await getShows?.docs) as Show[]) || []
      }
    },
    ['shows'],
    {
      tags: ['shows', 'schedule', 'playlists'],
      revalidate: 60 * 60, // 1 hour
    },
  )

  if (allShows || shows.length < 1) {
    const getShows = await payload.find({
      collection: 'shows',
      draft: false,
      limit: 1000,
      depth: 3,
      overrideAccess: false,
      pagination: false,
      select: {
        slug: true,
        stream_playlist: true,
        title: true,
      },
    })

    shows = ((await getShows?.docs) as Show[]) || []
  }

  // Create a schedule organized by day
  const scheduleByDay: Record<number, ScheduleEntry[]> = {}

  // Initialize empty arrays for each day of the week
  weekdays.forEach((_, index) => {
    scheduleByDay[index] = []
  })

  if (!shows || shows.length === 0) {
    console.error('No shows found')
    return null
  }

  // Process each show and its playlists
  shows.forEach((show) => {
    if (!show) return

    // Handle single playlist or array of playlists
    const playlists = Array.isArray(show.stream_playlist)
      ? show.stream_playlist.filter((p) => typeof p !== 'string')
      : typeof show.stream_playlist === 'string'
        ? []
        : show.stream_playlist
          ? [show.stream_playlist]
          : []

    // Process each playlist
    playlists.forEach((playlist) => {
      if (!playlist.schedule_items || !Array.isArray(playlist.schedule_items)) return

      try {
        // Add each scheduled item to the appropriate days
        playlist.schedule_items.forEach((item: any) => {
          item.days.forEach((day) => {
            day = day % 7 // normalize day to be in range 0-6, with sunday 7 = 0
            if (!scheduleByDay[day]) {
              return
            }
            scheduleByDay[day].push({
              showName: show.title || 'Untitled Show',
              playlistName: playlist.name || 'Untitled Playlist',
              startTime: item.start_time,
              endTime: item.end_time,
              slug: show.slug || '',
            })
          })
        })
      } catch (e) {
        console.error('Error processing schedule items:', e)
      }
    })
  })

  // Sort each day's schedule by start time
  Object.keys(scheduleByDay).forEach((day) => {
    scheduleByDay[Number(day)].sort((a, b) => a.startTime - b.startTime)
  })

  // Check if there are any scheduled items
  const hasSchedule = Object.values(scheduleByDay).some((items) => items.length > 0)

  if (!hasSchedule) {
    return null
  }

  return (
    <div className="container mt-8">
      {title && <h2 className="text-2xl font-bold mb-6">{title}</h2>}

      {description && <p className="mb-6">{description}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {weekdays.map((day, dayIndex) => {
          const daySchedule = scheduleByDay[dayIndex]

          return (
            <Card key={dayIndex} className="p-4">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">{day}</h3>

              {daySchedule.length > 0 ? (
                <div className="space-y-4">
                  {daySchedule.map((entry, entryIndex) => (
                    <div key={entryIndex} className="space-y-1">
                      <div className="flex border-b border-1 border-dotted">
                        <span className="text-sm min-w-48">
                          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                        </span>
                        <div className="text-sm font-bold">
                          <a href={`/shows/${entry.slug}`}>{entry.showName}</a>
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
    </div>
  )
}
