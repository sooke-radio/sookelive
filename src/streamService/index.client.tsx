'use client'

import React, { useRef, useEffect, useState } from 'react'
import { connectToWebSocket } from '@/streamService/azuracastNowplayingWs'
// import { AudioWaveform } from './AudioWaveform.index.client'
import type { StreamMetadata } from './types'


export type MediaPlayerProps = {
  className?: string
}


export const StreamPlayer: React.FC<MediaPlayerProps> = ({ className }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // create context for audio processing (visualizer))
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode | null>(null)
  useEffect(() => {
    if(!audioContext) {
      const ctx = new AudioContext()
      setAudioContext(ctx)
    }
  }, [audioContext])
  useEffect(() => {
    if (audioRef.current && audioContext && !audioSource) {
      const source = audioContext.createMediaElementSource(audioRef.current)
      source.connect(audioContext.destination)
      setAudioSource(source)
    }
  }, [audioRef, audioContext, audioSource])

  // const streamSrc = 'https://stream.sooke.live/listen/sookelive/high_192kbps.mp3';
  const streamSrc = '/api/stream'; // use proxy stream to enable visualizer

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
    if (audioContext && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
        audioContext.resume() 
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
      <div className='flex flex-wrap items-center justify-center gap-4 p-6 w-full w-max-w-xl h-[40vh] md:h-[220px]'>
        <audio ref={audioRef} src={streamSrc} />
        <button 
          onClick={togglePlay}
          className="w-32 h-32
          rounded-full
          bg-gradient-to-tr
          from-bright
          to-bright-4
          flex
          items-center
          justify-center
          hover:scale-105
          transition-transform"
        >
          {isPlaying ? (
            <div className="flex gap-2 basis-full justify-center w-full">
              <div className="w-[8px] h-[32px] bg-white rounded-sm" />
              <div className="w-[8px] h-[32px] bg-white rounded-sm" />
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
        {/* {audioSource && <AudioWaveform audioContext={audioContext} source={audioSource} />} */}


      </div>
  )
}
