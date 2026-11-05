'use client'

import React, { useEffect, useState } from 'react'
import { useFormFields, useFormProcessing } from '@payloadcms/ui'

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`

const formatElapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/**
 * Admin status banner for upload collections. Payload's upload form submits with
 * a plain fetch (no progress events), so this can't show a percentage - it shows
 * that the upload is running, the file size and elapsed time, and warns before
 * the page is closed mid-upload.
 */
const UploadStatus: React.FC = () => {
  const processing = useFormProcessing()
  const file = useFormFields(([fields]) => fields?.file?.value as File | undefined)
  const [elapsed, setElapsed] = useState(0)

  const uploading = processing && Boolean(file?.name)

  useEffect(() => {
    if (!uploading) return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      setElapsed(0)
      clearInterval(timer)
      window.removeEventListener('beforeunload', warn)
    }
  }, [uploading])

  if (!uploading || !file) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        background: 'var(--theme-elevation-100)',
        border: '1px solid var(--theme-elevation-300)',
        borderRadius: 'var(--style-radius-m, 4px)',
        bottom: 24,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        color: 'var(--theme-text)',
        left: '50%',
        maxWidth: 'min(520px, calc(100vw - 32px))',
        padding: '12px 16px',
        position: 'fixed',
        transform: 'translateX(-50%)',
        zIndex: 100,
      }}
    >
      <div style={{ fontWeight: 600 }}>Uploading… {formatElapsed(elapsed)}</div>
      <div style={{ overflowWrap: 'anywhere' }}>
        {file.name} ({formatSize(file.size)})
      </div>
      <div style={{ color: 'var(--theme-elevation-600)', fontSize: 13 }}>
        Large files can take a few minutes. Keep this page open until it finishes.
      </div>
      <div
        style={{
          background: 'var(--theme-elevation-200)',
          borderRadius: 2,
          height: 4,
          marginTop: 8,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            animation: 'upload-status-slide 1.4s ease-in-out infinite',
            background: 'var(--theme-success-500, #3a9d5d)',
            height: '100%',
            width: '35%',
          }}
        />
      </div>
      <style>{`@keyframes upload-status-slide{0%{margin-left:-35%}100%{margin-left:100%}}`}</style>
    </div>
  )
}

export default UploadStatus
