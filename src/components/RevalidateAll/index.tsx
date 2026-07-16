'use client'

import React, { Fragment, useCallback, useState } from 'react'
import { toast } from '@payloadcms/ui'

const errorMessage = 'An error occurred while revalidating.'

const RevalidateAll: React.FC = () => {
  const [loading, setLoading] = useState(false)

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (loading) {
        toast.info('Revalidation already in progress.')
        return
      }

      setLoading(true)

      toast.promise(
        fetch('/api/revalidate-all', { method: 'POST', credentials: 'include' }).then((res) => {
          if (!res.ok) throw new Error(errorMessage)
        }),
        {
          loading: 'Revalidating all pages...',
          success: 'All pages revalidated.',
          error: errorMessage,
        },
      )

      setLoading(false)
    },
    [loading],
  )

  return (
    <Fragment>
      <p>
        <strong>
          If images or other content look stale on the live site, use this to force every page to
          re-render on next visit:
        </strong>
      </p>
      <button
        className="seedButton"
        onClick={handleClick}
        style={{ fontSize: '14px', padding: '10px', cursor: 'pointer' }}
      >
        Revalidate All Pages
      </button>
    </Fragment>
  )
}

export default RevalidateAll
