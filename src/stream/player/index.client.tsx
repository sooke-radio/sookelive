'use client'

import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react'
import { Howl } from 'howler'
import { connectToWebSocket, forceReconnectWebSocket } from '@/stream/azuracast/nowplaying'
import { AudioWaveform } from './AudioWaveform.index.client'
import { selectMount } from './mountSelection'
import { QualityMenu } from './QualityMenu.client'
import type { StreamMetadata } from './types'

export type MediaPlayerProps = {
  className?: string
  chatUrl?: string | null
}

const LiveIndicator = ({ chatUrl }: { chatUrl?: string | null }) => {
  const className = 'bg-white text-black p-1 rounded font-bold inline-block mx-2 text-sm'
  if (chatUrl) {
    return (
      <a
        href={chatUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Join live chat on Discord"
        className={`${className} hover:bg-white/80 transition-colors`}
      >
        LIVE
      </a>
    )
  }
  return <div className={className}>LIVE</div>
}

// Legacy fallback for insecure contexts, where navigator.clipboard doesn't exist.
function copyViaExecCommand(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  try {
    document.execCommand('copy')
  } catch (err) {
    console.error('Fallback copy failed:', err)
  }
  document.body.removeChild(textarea)
}

// Define a type for player states
type PlayerState = 'stopped' | 'loading' | 'playing'

const PREFERRED_MOUNT_STORAGE_KEY = 'sookelive:preferredMountId'
const VOLUME_STORAGE_KEY = 'sookelive:volume'

// If we're supposedly playing but haven't heard a now-playing update in this
// long, assume the connection died silently (common on a network handoff -
// the underlying <audio> element often just goes quiet with no error event).
const STALE_METADATA_MS = 25_000
const STALE_CHECK_INTERVAL_MS = 10_000

export const StreamPlayer: React.FC<MediaPlayerProps> = ({ className, chatUrl }) => {
  const [playerState, setPlayerState] = useState<PlayerState>('stopped')
  const [sound, setSound] = useState<Howl | null>(null)
  const soundRef = useRef<Howl | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const playerStateRef = useRef<PlayerState>('stopped')
  const hasInitializedRef = useRef(false)
  const autoPlayRequestedRef = useRef(false)
  // 0 is a safe initial value: the stale-check below only ever reads this
  // once playerState is 'playing', which can't happen before at least one
  // real now-playing update has already set it via connectToWebSocket.
  const lastMetadataAtRef = useRef(0)

  // For visualization - refs hold the imperative Web Audio resources (read
  // only from effects/handlers); `visualizationNodes` mirrors them into state
  // purely so the JSX below has something render-safe to read.
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const [showVisualization, setShowVisualization] = useState(false)
  const [visualizationNodes, setVisualizationNodes] = useState<{
    ctx: AudioContext
    source: MediaElementAudioSourceNode
  } | null>(null)

  const [trackInfo, setNowPlaying] = useState<StreamMetadata>({
    title: 'Offline',
    show: 'Sooke Community Radio',
  })

  const mounts = useMemo(() => trackInfo.mounts ?? [], [trackInfo.mounts])

  const [selectedMountId, setSelectedMountId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(PREFERRED_MOUNT_STORAGE_KEY)
    return stored ? Number(stored) : null
  })

  const activeMount = useMemo(() => selectMount(mounts, selectedMountId), [mounts, selectedMountId])
  const activeMountRef = useRef(activeMount)

  useEffect(() => {
    activeMountRef.current = activeMount
  }, [activeMount])

  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === 'undefined') return 1
    const stored = window.localStorage.getItem(VOLUME_STORAGE_KEY)
    const parsed = stored ? Number(stored) : NaN
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 1
  })
  const volumeRef = useRef(volume)

  useEffect(() => {
    volumeRef.current = volume
    soundRef.current?.volume(volume)
  }, [volume])

  const setVolume = useCallback((next: number) => {
    const clamped = Math.min(1, Math.max(0, next))
    setVolumeState(clamped)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(clamped))
    }
  }, [])

  useEffect(() => {
    playerStateRef.current = playerState
  }, [playerState])

  const setPreferredMount = useCallback((mountId: number) => {
    setSelectedMountId(mountId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PREFERRED_MOUNT_STORAGE_KEY, String(mountId))
    }
  }, [])

  const unloadSound = useCallback(() => {
    // unload sound in Howler
    if (soundRef.current) {
      soundRef.current.unload()
      soundRef.current = null
      setSound(null)
    }
    // Clean up audio context
    if (audioContextRef.current) {
      audioContextRef.current.close().catch((err) => console.error('Error closing AudioContext:', err))
      audioContextRef.current = null
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect()
      audioSourceRef.current = null
    }
    setVisualizationNodes(null)
  }, [])

  // Holds the latest `initializeSound` so the onplayerror recovery below can
  // call it without a direct self-reference inside its own declaration.
  const initializeSoundRef = useRef<(playOnLoad?: boolean) => void>(() => {})

  // Initialize Howler sound object for the currently active mount
  const initializeSound = useCallback(
    (playOnLoad: boolean = false) => {
      const mount = activeMountRef.current
      if (!mount) return

      if (soundRef.current) {
        unloadSound()
      }

      // Cache-buster on the playing URL only - the copy-URL button uses mount.url directly.
      const newSound = new Howl({
        src: [`${mount.url}?nocache=${Date.now()}`],
        html5: true, // Required for streaming
        format: [mount.format],
        autoplay: false,
        volume: volumeRef.current,
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

          // Set timeout to unload after x seconds
          timeoutRef.current = setTimeout(() => {
            console.log('Stream paused timeout, unloading...')
            unloadSound()
          }, 30 * 1000)
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
          setTimeout(() => initializeSoundRef.current(), 1000)
        },
      })

      soundRef.current = newSound
      setSound(newSound)
      if (playOnLoad) {
        newSound.play()
      }
    },
    [unloadSound],
  )

  useEffect(() => {
    initializeSoundRef.current = initializeSound
  }, [initializeSound])

  // Setup visualization
  const setupVisualization = useCallback(() => {
    if (!soundRef.current || !Howl.ctx) return

    // If we don't have an audio context yet, use Howler's
    if (!audioContextRef.current) {
      audioContextRef.current = Howl.ctx
    }

    // Get the Howler sound node
    const node = soundRef.current.node
    if (!node) return

    // Create a MediaElementAudioSourceNode for the AudioWaveform component
    // Note: This is a bit of a hack since we don't have direct access to the audio element
    // with Howler, but we can use the node to create an analyzer
    if (!audioSourceRef.current && audioContextRef.current) {
      const analyzer = audioContextRef.current.createAnalyser()
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
        },
      } as unknown as MediaElementAudioSourceNode

      audioSourceRef.current = fakeSource
      setVisualizationNodes({ ctx: audioContextRef.current, source: fakeSource })
      setShowVisualization(true)
    } else {
      setShowVisualization(true)
    }
  }, [])

  // Initialize (or re-initialize on a quality change) once mount data is available.
  useEffect(() => {
    if (!activeMount) return

    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      initializeSound(autoPlayRequestedRef.current)
    } else {
      initializeSound(playerStateRef.current === 'playing')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMount?.id])

  useEffect(() => {
    const cleanup = connectToWebSocket((update) => {
      lastMetadataAtRef.current = Date.now()
      setNowPlaying(update)
    })
    return cleanup
  }, [])

  // Recover from a silently-dead connection (e.g. WiFi/cellular handoff)
  // without requiring a page refresh: reconnect the metadata socket and, if
  // we're supposed to be playing, reload the audio stream too.
  useEffect(() => {
    const recover = () => {
      forceReconnectWebSocket()
      if (playerStateRef.current === 'playing') {
        initializeSoundRef.current(true)
      }
    }

    const onOnline = () => recover()
    window.addEventListener('online', onOnline)

    const staleCheck = setInterval(() => {
      if (
        playerStateRef.current === 'playing' &&
        Date.now() - lastMetadataAtRef.current > STALE_METADATA_MS
      ) {
        recover()
      }
    }, STALE_CHECK_INTERVAL_MS)

    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(staleCheck)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (soundRef.current) {
        soundRef.current.unload()
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch((err) => console.error('Error closing AudioContext:', err))
      }
      if (audioSourceRef.current) {
        audioSourceRef.current.disconnect()
      }
    }
  }, [])

  const togglePlay = () => {
    if (!sound) {
      if (!activeMountRef.current) {
        // No mount data yet - remember the request; the init effect will
        // autoplay once mounts arrive over the WebSocket.
        autoPlayRequestedRef.current = true
        setPlayerState('loading')
        return
      }
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

  const [copied, setCopied] = useState(false)
  const copyStreamUrl = () => {
    if (!activeMount) return
    const url = activeMount.url

    // navigator.clipboard is only defined in secure contexts (HTTPS, or
    // exactly `localhost`) - fall back to the legacy execCommand approach
    // when accessed over plain HTTP on another host (e.g. a LAN IP).
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => copyViaExecCommand(url))
    } else {
      copyViaExecCommand(url)
    }

    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 p-6 w-full w-max-w-xl h-[40vh] md:h-[220px]">
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
          {trackInfo.live && <LiveIndicator chatUrl={chatUrl} />}
        </span>

        <span className="text-lg"></span>

        <span className="text-xs">
          {trackInfo.artist ? (
            <>
              {trackInfo.artist} <br />
            </>
          ) : (
            ''
          )}
          {trackInfo.title}
        </span>
      </div>

      <QualityMenu
        mounts={mounts}
        activeMountId={activeMount?.id ?? null}
        onSelectMount={setPreferredMount}
        onCopyUrl={copyStreamUrl}
        copied={copied}
        volume={volume}
        onVolumeChange={setVolume}
      />

      {/* Visualization component */}
      {showVisualization && visualizationNodes && (
        <AudioWaveform audioContext={visualizationNodes.ctx} source={visualizationNodes.source} />
      )}
    </div>
  )
}
