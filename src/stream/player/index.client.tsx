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
  const resetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // const streamSrc = '/api/stream'; // use proxy stream to enable visualizer
  // visualizer disabled - proxied stream prevents stats from being collected in azuracast. maybe there's a workaround?
  const streamSrc = `${process.env.NEXT_PUBLIC_AZURACAST_URL}/listen/${process.env.NEXT_PUBLIC_AZURACAST_STATION_ID}/high_192kbps.mp3`;
  // TODO: ability to swap between 192 and 96 kbps streams


  // create context for audio processing (visualizer))
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode | null>(null)

  const connectToSource = () => {
    console.log('Connecting to audio source...');
    if (audioRef.current && audioContext && !audioSource) {
      try {
        const source = audioContext.createMediaElementSource(audioRef.current);
        source.connect(audioContext.destination);
        setAudioSource(source);
        return source; // Return the source for immediate use if needed
      } catch (error) {
        console.error("Error connecting audio source:", error);
        return null;
      }
    }
    return null;
  };
  
  const resetAudioStream = () => {
    console.log('Resetting audio stream...');
    
    // Clean up existing resources
    if (audioSource) {
      audioSource.disconnect();
      setAudioSource(null);
    }
    
    if (audioContext) {
      audioContext.close().catch(err => console.error('Error closing AudioContext:', err));
      setAudioContext(null);
    }
    
    // Create new audio context
    const newContext = new AudioContext();
    setAudioContext(newContext);
    
    // Reset the audio element
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = streamSrc;
      audioRef.current.load();
    }
  };

  // reset stream on pageload to ensure an updated stream is loaded
  useEffect(() => {
    resetAudioStream();
  }, []);

  useEffect(() => {
    if(!audioContext) {
      const ctx = new AudioContext()
      setAudioContext(ctx)
    } 
    // Cleanup function to close the audio context when component unmounts
    return () => {
      if(audioContext) {
        audioContext.close().catch(err => console.error('Error closing AudioContext:', err))
      }
    }
  }, [audioContext])

  useEffect(() => {
    connectToSource();
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
    // if (resetTimerRef.current) {
    //   clearTimeout(resetTimerRef.current);
    // }
    if (audioContext && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()

        // close audio context if stream is paused for 30 seconds
        // resetTimerRef.current = setTimeout(() => {
        //   console.log('Stream paused for 30 seconds, closing stream..');
        //   audioContext.close();
        // }, 30 * 1000);

      } else {
        try {
          // Make sure audio context is running
          if (audioContext && audioContext.state === 'suspended') {
            console.log('resume stream')
            audioContext.resume()
          } else {
            // reconnect stream
            
            // connectToSource();
          }
          // Play the audio
          audioRef.current.play()
          
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
              {/* {trackInfo.showSrc ? (
                <a href={trackInfo.showSrc} className="hover:underline">
                  {trackInfo.show}
                </a>
              ) : ( */}
               { trackInfo.show }
              {/* )} */}
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