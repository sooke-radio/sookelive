'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Settings, Check, Copy } from 'lucide-react'
import type { AzuracastMount } from '@/stream/azuracast/types'

export type QualityMenuProps = {
  mounts: AzuracastMount[]
  activeMountId: number | null
  onSelectMount: (mountId: number) => void
  onCopyUrl: () => void
  copied: boolean
}

export const QualityMenu: React.FC<QualityMenuProps> = ({
  mounts,
  activeMountId,
  onSelectMount,
  onCopyUrl,
  copied,
}) => {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="relative flex flex-col items-center gap-1" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Stream options"
        title="Stream options"
        className="w-9 h-9 rounded-full flex items-center justify-center text-secondary dark:text-primary hover:bg-white/10 transition-colors"
      >
        <Settings size={20} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-md bg-black border border-white/10 shadow-lg p-2 text-secondary dark:text-primary">
          {mounts.length > 1 && (
            <div className="mb-2">
              <div className="px-2 pb-1 text-xs uppercase tracking-wide opacity-60">Quality</div>
              {mounts.map((mount) => (
                <button
                  key={mount.id}
                  onClick={() => onSelectMount(mount.id)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
                >
                  <span>{mount.name}</span>
                  {mount.id === activeMountId && <Check size={14} />}
                </button>
              ))}
              <div className="my-2 border-t border-white/10" />
            </div>
          )}

          <button
            onClick={onCopyUrl}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-white/10 transition-colors"
          >
            <Copy size={14} />
            {copied ? 'Copied!' : 'Copy stream URL'}
          </button>
        </div>
      )}
    </div>
  )
}
