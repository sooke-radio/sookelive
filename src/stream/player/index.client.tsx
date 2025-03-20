'use client'

import React, { useRef, useEffect, useState } from 'react'
import { connectToWebSocket } from '@/stream/azuracast/nowplaying'
// import { AudioWaveform } from './AudioWaveform.index.client'
import type { StreamMetadata } from './types'


export type MediaPlayerProps = {
  className?: string
}

const LiveIndicator = () => {
  return (
    <div className="bg-white text-black p-1 rounded font-bold inline-block mx-2 text-sm">
      LIVE
    </div>
  )
}

export const StreamPlayer: React.FC<MediaPlayerProps> = ({ className }) => {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const streamSrc = '/api/stream'; // use proxy stream to enable visualizer

  let playerError = false;

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


  const [trackInfo, setNowPlaying] = useState<StreamMetadata>({
    title: 'Offline',
    show: 'Sooke Community Radio'
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
        try {
          audioRef.current.play()
          audioContext.resume()
        } catch (error) {
          
        }
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (()=>{
    if (playerError) {
      return (
        <div>Error.</div>
      )
    } else {
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
  
          <div className="flex flex-col text-secondary dark:text-primary">
            <span className="text-lg">
              {trackInfo.showSrc ? (
                <a href={trackInfo.showSrc} className="hover:underline">
                  {trackInfo.show}
                </a>
              ) : (
                trackInfo.show
              )}
              {trackInfo.live && <LiveIndicator />} 
            </span>
  
            <span className="text-lg "></span>
     
              <span className="text-sm">
                {trackInfo.artist && trackInfo.artist + " - "}{trackInfo.title}
              </span>
          </div>
          {/* {audioSource && <AudioWaveform audioContext={audioContext} source={audioSource} />} */}
          </div>
      )
    }
  })()
  
}