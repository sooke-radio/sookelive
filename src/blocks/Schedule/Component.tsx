import React from 'react'
import { weekdays, isScheduleItemActive } from '@/schedule/schedule-common'
import { Show } from '@/payload-types'
import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { ScheduleViews } from './ScheduleViews'
import { ScheduleByDay, ScheduleEntry } from './types'

interface Props {
  shows?: Show[]
  allShows?: boolean
  title?: string
  description?: string
}

export const ScheduleBlock: React.FC<Props> = async ({
  shows = [],
  allShows = false,
  title,
  description = '',
}) => {
  const payload = await getPayload({ config: configPromise })

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
        shuffle: true,
      },
    })

    shows = ((await getShows?.docs) as Show[]) || []
  }

  // Create a schedule organized by day
  const scheduleByDay: ScheduleByDay = {}

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
      if (playlist.is_enabled === false) return
      if (!playlist.schedule_items || !Array.isArray(playlist.schedule_items)) return

      try {
        // Add each scheduled item to the appropriate days
        playlist.schedule_items.forEach((item: any) => {
          if (!isScheduleItemActive(item)) return

          item.days.forEach((day) => {
            day = day % 7 // normalize day to be in range 0-6, with sunday 7 = 0
            if (!scheduleByDay[day]) {
              return
            }
            scheduleByDay[day].push({
              playlistName: playlist.name || 'Untitled Playlist',
              startTime: item.start_time,
              endTime: item.end_time,
              slug: show.slug || '',
              shuffle: Boolean(show.shuffle),
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
    scheduleByDay[Number(day)].sort((a: ScheduleEntry, b: ScheduleEntry) => a.startTime - b.startTime)
  })

  // Check if there are any scheduled items
  const hasSchedule = Object.values(scheduleByDay).some((items) => items.length > 0)

  if (!hasSchedule) {
    return null
  }

  return <ScheduleViews scheduleByDay={scheduleByDay} title={title} description={description} />
}
