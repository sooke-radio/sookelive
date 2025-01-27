'use client'

import React, { useRef, useEffect, useState } from 'react'
import { cn } from '@/utilities/ui'
import { connectToWebSocket } from '@/streamService/websocketMetadata'

export type StreamMetadata = {
  title: string
  artist: string
  show?: string
}

export type MediaPlayerProps = {
  className?: string
}


export const MediaPlayer: React.FC<MediaPlayerProps> = ({ className }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const streamSrc = 'https://stream.sooke.live/listen/sookelive/high_192kbps.mp3';
  
  const [trackInfo, setNowPlaying] = useState<StreamMetadata>({
    title: 'Loading...',
    artist: 'SRS',
    show: 'Sooke Community Radio',
  })

  useEffect(() => {
    const cleanup = connectToWebSocket(setNowPlaying);
    return cleanup;
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className={cn('flex items-center gap-4 p-6', className)}>
      <audio ref={audioRef} src={streamSrc} />
      <button 
        onClick={togglePlay}
        className="w-32 h-32
        rounded-full
        bg-gradient-to-tr
        from-bright
        to-dark
        flex
        items-center
        justify-center
        hover:scale-105
        transition-transform"
      >
        {isPlaying ? (
          <div className="flex gap-1">
            <div className="w-[4px] h-[16px] bg-white rounded-sm" />
            <div className="w-[4px] h-[16px] bg-white rounded-sm" />
          </div>
        ) : (
          <div className="w-0 h-0 border-t-[16px] border-t-transparent border-l-[32px] border-l-white border-b-[16px] border-b-transparent ml-1" />
        )}
      </button>
      <div className="flex flex-col">
        <span className="text-xl font-bold">{trackInfo.title}</span>
        <span className="text-lg">{trackInfo.artist}</span>
        {trackInfo.show && <span className="text-sm">{trackInfo.show}</span>}
      </div>
    </div>
  )
}
