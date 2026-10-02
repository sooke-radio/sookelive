'use client'

import React, { createContext, useCallback, useContext, useState } from 'react'

type AudioSourceContextValue = {
  activeId: string | null
  claim: (id: string) => void
}

const AudioSourceContext = createContext<AudioSourceContextValue | null>(null)

// Coordinates the live stream and episode players so starting one pauses the
// other - only one `<audio>` source should ever be playing at a time.
export const AudioSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeId, setActiveId] = useState<string | null>(null)

  const claim = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  return (
    <AudioSourceContext.Provider value={{ activeId, claim }}>{children}</AudioSourceContext.Provider>
  )
}

export const useAudioSource = (): AudioSourceContextValue => {
  const context = useContext(AudioSourceContext)
  if (!context) {
    throw new Error('useAudioSource must be used within an AudioSourceProvider')
  }
  return context
}
