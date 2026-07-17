export interface ScheduleItem {
  start_time: number
  end_time: number
  start_date: string | null
  end_date: string | null
  days: number[]
  loop_once: boolean
  id: number
}

export interface Playlist {
  id: string
  az_id: number
  name: string
  short_name: string
  schedule_items: ScheduleItem[]
  is_enabled: boolean
  lastSync: string
  createdAt: string
  updatedAt: string
}

export interface Props {
  playlist: Playlist
}

export const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

// Convert a time like 1630 (4:30 PM) into minutes since midnight (990)
export const timeToMinutes = (time: number): number => {
  if (!time) return 0

  const timeStr = time.toString().padStart(4, '0')
  const hours = parseInt(timeStr.substring(0, 2), 10)
  const minutes = parseInt(timeStr.substring(2, 4), 10)

  return hours * 60 + minutes
}

// Azuracast returns start_date/end_date as "YYYY-MM-DD" strings (local station date, no time component)
const parseScheduleDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

// A schedule item with a start_date and/or end_date is only active within that
// date range; one with neither is a permanently recurring weekly slot.
export const isScheduleItemActive = (
  item: Pick<ScheduleItem, 'start_date' | 'end_date'>,
  referenceDate: Date = new Date(),
): boolean => {
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate())

  if (item.start_date && today < parseScheduleDate(item.start_date)) return false
  if (item.end_date && today > parseScheduleDate(item.end_date)) return false

  return true
}

export const formatTime = (time: number): string => {
  if (!time) return ''

  // Convert number like 1630 to string "1630"
  const timeStr = time.toString().padStart(4, '0')

  // Extract hours and minutes
  const hours = parseInt(timeStr.substring(0, 2), 10)
  const minutes = timeStr.substring(2, 4)

  // Determine AM/PM
  const period = hours >= 12 ? 'PM' : 'AM'

  // Convert to 12-hour format
  let hour12 = hours % 12
  if (hour12 === 0) hour12 = 12 // 0 should be displayed as 12

  return `${hour12}:${minutes} ${period}`
}
