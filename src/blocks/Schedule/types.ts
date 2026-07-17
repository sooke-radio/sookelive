export interface ScheduleEntry {
  playlistName: string
  startTime: number
  endTime: number
  slug: string
  shuffle: boolean
}

export type ScheduleByDay = Record<number, ScheduleEntry[]>
