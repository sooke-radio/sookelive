export interface AzuracastMount {
  id: number
  name: string
  url: string
  bitrate: number | null
  format: string
  is_default: boolean
  path: string
}

export interface AzuracastNowPlaying {
  station: {
    mounts: AzuracastMount[]
  }
  live: {
    is_live: boolean
    streamer_name: string
    stream_name?: string
  }
  now_playing: {
    played_at: number
    playlist: string
    song: { title: string; artist: string }
  }
  current_time: number
}
