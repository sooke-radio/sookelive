'use client'

import React, { useEffect, useRef } from 'react'
import { TextField, useDocumentInfo, useField, useFormFields } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

const stripExtension = (name: string) => name.replace(/\.[^.]+$/, '')

/**
 * Title field for upload collections: when a file is picked on a new document,
 * pre-fills the title with the filename (minus extension). Stays editable - the
 * value is only replaced while it is empty or still the last auto-filled one.
 */
const EpisodeAudioTitle: TextFieldClientComponent = (props) => {
  const { path } = props
  const { id } = useDocumentInfo()
  const { setValue, value } = useField<string>({ path })
  const file = useFormFields(([fields]) => fields?.file?.value as File | undefined)
  const lastAutoValue = useRef<string>('')

  const fileName = file?.name

  useEffect(() => {
    if (id || !fileName) return
    const suggested = stripExtension(fileName)
    if (!value || value === lastAutoValue.current) {
      lastAutoValue.current = suggested
      setValue(suggested)
    }
    // Only react to the chosen file changing, not to the user's edits to value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileName, id])

  return <TextField {...props} />
}

export default EpisodeAudioTitle
