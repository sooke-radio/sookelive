'use client'

import React, { Fragment, useCallback, useState } from 'react'
import { toast } from '@payloadcms/ui'

const SuccessMessage: React.FC = () => (
  <div>
    Collection updated!
  </div>
)

const errorMessage = "An error occured while syncing."
const collection = 'playlists';


const SyncPlaylists: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault()

      if (seeded) {
        toast.info(`${collection} is already synced.`)
        return
      }
      if (loading) {
        toast.info('Sync already in progress.')
        return
      }
      if (error) {
        toast.error(errorMessage)
        return
      }

      setLoading(true)

      try {
        toast.promise(
          new Promise((resolve, reject) => {
            try {
              fetch(`/api/${collection}/sync`, { method: 'POST', credentials: 'include' })
                .then((res) => {
                  console.log(res)
                  if (res.ok) {
                    resolve(true)
                    setSeeded(true)
                  } else {
                    reject(errorMessage)
                  }
                })
                .catch((error) => {
                  reject(error)
                })
            } catch (error) {
              reject(error)
            }
          }),
          {
            loading: 'Syncing from Azuracast...',
            success: <SuccessMessage />,
            error: errorMessage,
          },
        )
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        setError(error)
      }
    },
    [loading, seeded, error],
  )

  let message = ''
  if (loading) message = ' (syncing...)'
  if (seeded) message = ' (done!)'
  if (error) message = ` (error: ${error})`

  return (
    <Fragment>
      <p><strong>Use the button below to refresh playlist and schedule data from Azuracast:</strong></p>
      <button className="seedButton" onClick={handleClick}
      style={{fontSize: '14px', 'padding': '10px', cursor: 'pointer'}}
      >
        Refresh Playlists
      </button>
      {message}
    </Fragment>
  )
}

export default SyncPlaylists