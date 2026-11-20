import Link from 'next/link'
import React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAX_QUERY_LENGTH } from '@/utilities/archive'

// Same look as <Input>, for the native <select> (native so the form works without JS).
const selectClassName =
  'flex h-10 w-full rounded border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-64'

type Props = {
  baseUrl: string
  label: string
  q: string
  show?: string
  showOptions?: { slug: string; title: string }[]
}

/** Plain GET form: submitting navigates to `baseUrl?q=...&show=...`. */
export const ArchiveSearch: React.FC<Props> = ({ baseUrl, label, q, show = '', showOptions }) => {
  const isFiltered = Boolean(q || show)

  return (
    <form
      action={baseUrl}
      method="get"
      role="search"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
    >
      <label htmlFor="archive-q" className="sr-only">
        Search {label}
      </label>
      <Input
        id="archive-q"
        name="q"
        type="search"
        defaultValue={q}
        maxLength={MAX_QUERY_LENGTH}
        placeholder={`Search ${label}`}
      />

      {showOptions && (
        <>
          <label htmlFor="archive-show" className="sr-only">
            Filter by show
          </label>
          <select id="archive-show" name="show" defaultValue={show} className={selectClassName}>
            <option value="">All shows</option>
            {showOptions.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.title}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="flex gap-2">
        <Button type="submit">Search</Button>
        {isFiltered && (
          <Button asChild variant="outline">
            <Link href={baseUrl}>Clear</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
