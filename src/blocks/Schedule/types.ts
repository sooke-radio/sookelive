export interface ScheduleEntry {
  playlistName: string
  startTime: number
  endTime: number
  slug: string
}

export type ScheduleByDay = Record<number, ScheduleEntry[]>
