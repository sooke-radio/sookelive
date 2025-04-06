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

  // const streamSrc = '/api/stream'; // use proxy stream to enable visualizer
  // visualizer disabled - proxied stream prevents stats from being collected in azuracast. maybe there's a workaround?
  const streamSrc = `${process.env.NEXT_PUBLIC_AZURACAST_URL}/listen/${process.env.NEXT_PUBLIC_AZURACAST_STATION_ID}/high_192kbps.mp3`;
  // TODO: ability to swap between 192 and 96 kbps streams


  // create context for audio processing (visualizer))
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode | null>(null)
  useEffect(() => {
    if(!audioContext) {
      const ctx = new AudioContext()
      setAudioContext(ctx)
    }
    // Cleanup function to close the audio context when component unmounts
    // return () => {
    //   if(audioContext) {
    //     audioContext.close().catch(err => console.error('Error closing AudioContext:', err))
    //   }
    // }
  }, [audioContext])

  useEffect(() => {
    if (audioRef.current && audioContext && !audioSource) {
      try {
        const source = audioContext.createMediaElementSource(audioRef.current)
        source.connect(audioContext.destination)
        setAudioSource(source)
      } catch (error) {
        console.error("Error connecting audio source:", error)
      }
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
          // Make sure audio context is running
          if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume()
          }
          // Play the audio
          const playPromise = audioRef.current.play()

          // Handle play promise
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true)
              })
              .catch(error => {
                console.error("Error playing audio:", error)
                setIsPlaying(false)
              })
          }
          // audioContext.resume()
        } catch (error) {
          console.error('Error playing audio:', error)
        }
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (()=>{
    // todo: add error handling
    return (
      <div className='flex flex-wrap items-center justify-center gap-4 p-6 w-full w-max-w-xl h-[40vh] md:h-[220px]'>
          <audio ref={audioRef} src={streamSrc} crossOrigin="anonymous"/>
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
     
              <span className="text-xs">
                {trackInfo.artist ? (
                  <>
                    {trackInfo.artist} <br />
                  </>
                ) : ''}
                {trackInfo.title}
              </span>
          </div>
          {/* {audioSource && <AudioWaveform audioContext={audioContext} source={audioSource} />} */}
          </div>
      )
    
  })()
  
}