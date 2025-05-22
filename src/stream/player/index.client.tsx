'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Howl } from 'howler'
import { connectToWebSocket } from '@/stream/azuracast/nowplaying'
import { AudioWaveform } from './AudioWaveform.index.client'
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

// Define a type for player states
type PlayerState = 'stopped' | 'loading' | 'playing';

export const StreamPlayer: React.FC<MediaPlayerProps> = ({ className }) => {
  const [playerState, setPlayerState] = useState<PlayerState>('stopped')
  const [sound, setSound] = useState<Howl | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  
  // For visualization
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [audioSource, setAudioSource] = useState<MediaElementAudioSourceNode | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)

  const streamSrc = `${process.env.NEXT_PUBLIC_AZURACAST_URL}/listen/${process.env.NEXT_PUBLIC_AZURACAST_STATION_ID}/high_192kbps.mp3`

  // Initialize Howler sound object
  const initializeSound = (playOnLoad: boolean = false) => {
    // Unload any existing sound
    if (sound) {
      sound.unload()
    }

    // Create new Howl instance
    const newSound = new Howl({
      src: [streamSrc],
      html5: true, // Required for streaming
      format: ['mp3'],
      autoplay: false,
      onload: () => {
        console.log('Stream loaded')
        setPlayerState('stopped')
      },
      onplay: () => {
        setPlayerState('playing')
        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
        
        // Setup visualization when playing starts
        // setupVisualization()
      },
      onpause: () => {
        setPlayerState('stopped')
        // setShowVisualization(false)
        
        // Set timeout to unload after 60 seconds
        timeoutRef.current = setTimeout(() => {
          console.log('Stream paused for 60 seconds, unloading...')
          sound?.unload()
          setSound(null)
          
          // Clean up audio context
          if (audioContext) {
            audioContext.close().catch(err => console.error('Error closing AudioContext:', err))
            setAudioContext(null)
          }
          if (audioSource) {
            audioSource.disconnect();
            setAudioSource(null);
          }
        }, 60 * 1000)
      },
      onstop: () => {
        setPlayerState('stopped')
        setShowVisualization(false)
      },
      onloaderror: (id, error) => {
        console.error('Error loading stream:', error)
        setPlayerState('stopped')
      },
      onplayerror: (id, error) => {
        console.error('Error playing stream:', error)
        setPlayerState('stopped')
        // Try to recover by reinitializing
        setTimeout(initializeSound, 1000)
      }
    })

    setSound(newSound)
    if(playOnLoad) {
      newSound.play()
    }
  }

  // Setup visualization
  const setupVisualization = () => {
    if (!sound || !Howl.ctx) return
    
    // If we don't have an audio context yet, use Howler's
    if (!audioContext) {
      setAudioContext(Howl.ctx)
    }
    
    // Get the Howler sound node
    const node = sound.node
    if (!node) return
    
    // Create a MediaElementAudioSourceNode for the AudioWaveform component
    // Note: This is a bit of a hack since we don't have direct access to the audio element
    // with Howler, but we can use the node to create an analyzer
    if (!audioSource && audioContext) {
      const analyzer = audioContext.createAnalyser()
      analyzer.fftSize = 256
      
      // Connect the Howler node to our analyzer
      node.connect(analyzer)
      
      // We'll use this analyzer as our "source" for the AudioWaveform component
      // by wrapping it in an object that mimics MediaElementAudioSourceNode
      const fakeSource = {
        connect: (destination: AudioNode) => {
          analyzer.connect(destination)
          return fakeSource
        },
        disconnect: () => {
          analyzer.disconnect()
        }
      } as unknown as MediaElementAudioSourceNode
      
      setAudioSource(fakeSource)
      setShowVisualization(true)
    } else {
      setShowVisualization(true)
    }
  }

  // Initialize on component mount
  useEffect(() => {
    initializeSound()
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (sound) {
        sound.unload()
      }
      if (audioContext) {
        audioContext.close().catch(err => console.error('Error closing AudioContext:', err))
      }
      if (audioSource) {
        audioSource.disconnect();
      }
    }
  }, [])

  const [trackInfo, setNowPlaying] = useState<StreamMetadata>({
    title: 'Offline',
    show: 'Sooke Community Radio'
  })

  useEffect(() => {
    const cleanup = connectToWebSocket(setNowPlaying)
    return cleanup
  }, [])

  const togglePlay = () => {
    if (!sound) {
      setPlayerState('loading')
      initializeSound(true)
      return
    }

    if (playerState === 'playing') {
      sound.pause()
    } else {
      setPlayerState('loading')
      sound.play()
    }
  }

  return (
    <div className='flex flex-wrap items-center justify-center gap-4 p-6 w-full w-max-w-xl h-[40vh] md:h-[220px]'>
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
        {playerState === 'loading' ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : playerState === 'playing' ? (
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
          {trackInfo.show}
          {trackInfo.live && <LiveIndicator />} 
        </span>

        <span className="text-lg"></span>
 
        <span className="text-xs">
          {trackInfo.artist ? (
            <>
              {trackInfo.artist} <br />
            </>
          ) : ''}
          {trackInfo.title}
        </span>
      </div>
      
      {/* Visualization component */}
      {showVisualization && audioContext && audioSource && (
        <AudioWaveform audioContext={audioContext} source={audioSource} />
      )}
    </div>
  )
}
