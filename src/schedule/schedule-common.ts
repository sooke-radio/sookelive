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
  lastSync: string
  createdAt: string
  updatedAt: string
}

export interface Props {
  playlist: Playlist
}

export const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const formatTime = (time: number): string => {
  if (!time) return '';
  
  // Convert number like 1630 to string "1630"
  const timeStr = time.toString().padStart(4, '0');
  
  // Extract hours and minutes
  const hours = parseInt(timeStr.substring(0, 2), 10);
  const minutes = timeStr.substring(2, 4);
  
  // Determine AM/PM
  const period = hours >= 12 ? 'PM' : 'AM';
  
  // Convert to 12-hour format
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12; // 0 should be displayed as 12
  
  return `${hour12}:${minutes} ${period}`;
}