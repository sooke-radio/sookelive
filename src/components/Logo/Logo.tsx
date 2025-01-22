import clsx from 'clsx'
import React from 'react'

interface Props {
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: 'auto' | 'high' | 'low'
}

export const Logo = (props: Props) => {
  const { loading: loadingFromProps, priority: priorityFromProps, className } = props

  const loading = loadingFromProps || 'lazy'
  const priority = priorityFromProps || 'low'

  return (
        // todo: use next Image
    /* eslint-disable @next/next/no-img-element */
    <img
      alt="The Sooke Radio Society Logo showing the word Sooke superimposed over a line drawing of a boombox with the words Radio Society beneath."
      className="max-w-[220px] invert"
      src="/srs-logo-sq.png"
      loading={loading}
      fetchPriority={priority}
      decoding = "async"
    />
  )
}
