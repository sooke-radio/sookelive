'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Howl } from 'howler'

import { useAudioSource } from '@/providers/AudioSource'

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused'

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export type EpisodePlayerProps = {
  episodeId: string
  src: string
  className?: string
}

export const EpisodePlayer: React.FC<EpisodePlayerProps> = ({ episodeId, src, className }) => {
  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [duration, setDuration] = useState(0)
  const [position, setPosition] = useState(0)
  const [seekValue, setSeekValue] = useState<number | null>(null)

  const soundRef = useRef<Howl | null>(null)
  const rafRef = useRef<number | null>(null)
  const { activeId, claim } = useAudioSource()

  const stopTicking = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  // Holds the latest `tick` so its own rAF loop can re-schedule itself
  // without a direct self-reference inside its own declaration.
  const tickRef = useRef<() => void>(() => {})

  const tick = useCallback(() => {
    const seek = soundRef.current?.seek()
    if (typeof seek === 'number') setPosition(seek)
    rafRef.current = requestAnimationFrame(() => tickRef.current())
  }, [])

  useEffect(() => {
    tickRef.current = tick
  }, [tick])

  const ensureSound = useCallback(() => {
    if (soundRef.current) return soundRef.current

    // html5: true is required for Range-request seeking on the underlying
    // <audio> element instead of a full-file WebAudio download.
    const sound = new Howl({
      src: [src],
      html5: true,
      preload: 'metadata',
      onload: () => setDuration(sound.duration()),
      onplay: () => {
        setPlayerState('playing')
        claim(episodeId)
        stopTicking()
        rafRef.current = requestAnimationFrame(tick)
      },
      onpause: () => {
        setPlayerState('paused')
        stopTicking()
      },
      onstop: () => {
        setPlayerState('idle')
        stopTicking()
      },
      onend: () => {
        setPlayerState('idle')
        setPosition(0)
        stopTicking()
      },
      onloaderror: (id, error) => {
        console.error('Error loading episode audio:', error)
        setPlayerState('idle')
      },
      onplayerror: (id, error) => {
        console.error('Error playing episode audio:', error)
        setPlayerState('idle')
      },
    })

    soundRef.current = sound
    return sound
  }, [src, episodeId, claim, stopTicking, tick])

  const togglePlay = () => {
    const sound = ensureSound()
    if (playerState === 'playing') {
      sound.pause()
    } else {
      setPlayerState('loading')
      sound.play()
    }
  }

  // Another player (the live stream, or a different episode) claimed
  // playback - pause ourselves so only one source is ever audible.
  useEffect(() => {
    if (activeId !== episodeId && playerState === 'playing') {
      soundRef.current?.pause()
    }
  }, [activeId, episodeId, playerState])

  useEffect(() => {
    return () => {
      stopTicking()
      soundRef.current?.unload()
      soundRef.current = null
    }
  }, [stopTicking])

  const handleSeekCommit = (value: number) => {
    soundRef.current?.seek(value)
    setPosition(value)
    setSeekValue(null)
  }

  const displayPosition = seekValue ?? position

  return (
    <div className={`flex items-center gap-4 w-full ${className ?? ''}`}>
      <button
        onClick={togglePlay}
        aria-label={playerState === 'playing' ? 'Pause' : 'Play'}
        className="w-12 h-12 rounded-full bg-gradient-to-tr from-bright to-bright-4 flex items-center justify-center hover:scale-105 transition-transform shrink-0"
      >
        {playerState === 'loading' ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
        ) : playerState === 'playing' ? (
          <div className="flex gap-1">
            <div className="w-[4px] h-[16px] bg-white rounded-sm" />
            <div className="w-[4px] h-[16px] bg-white rounded-sm" />
          </div>
        ) : (
          <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[14px] border-l-white border-b-[8px] border-b-transparent ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs tabular-nums w-10 text-right">{formatTime(displayPosition)}</span>
        <input
          aria-label="Seek"
          type="range"
          min={0}
          max={duration || 0}
          step={1}
          value={displayPosition}
          onChange={(e) => setSeekValue(Number(e.target.value))}
          onMouseUp={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
          onTouchEnd={(e) => handleSeekCommit(Number((e.target as HTMLInputElement).value))}
          className="flex-1"
        />
        <span className="text-xs tabular-nums w-10">{formatTime(duration)}</span>
      </div>
    </div>
  )
}
