'use client'

import React, { useEffect } from 'react'
import { useDocumentInfo, useFormModified } from '@payloadcms/ui'

const MESSAGE = 'This document has not been saved yet. Leave and lose your changes?'

/**
 * UI-only (no stored data). With `versions.drafts.validate: true` a new document
 * isn't created until its first save, and Payload disables its own
 * leave-without-saving prompt for autosave collections - so nothing would warn
 * about losing the first unsaved edits. This restores that warning for new,
 * modified documents only; once the doc exists, autosave takes over.
 */
const UnsavedNewDocWarning: React.FC = () => {
  const { id } = useDocumentInfo()
  const modified = useFormModified()
  const active = !id && modified

  useEffect(() => {
    if (!active) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    // In-app navigation doesn't fire beforeunload, so confirm on internal link clicks.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = (event.target as HTMLElement | null)?.closest?.('a[href]')
      if (!anchor || anchor.getAttribute('target') === '_blank') return
      const href = anchor.getAttribute('href') ?? ''
      if (href.startsWith('#')) return
      if (!window.confirm(MESSAGE)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [active])

  return null
}

export default UnsavedNewDocWarning
