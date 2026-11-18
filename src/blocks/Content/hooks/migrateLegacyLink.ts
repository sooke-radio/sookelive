import type { FieldHook } from 'payload'

type Column = {
  enableLink?: boolean | null
  link?: Record<string, unknown> | null
  links?: { link?: Record<string, unknown> | null }[] | null
  [k: string]: unknown
}

/**
 * Columns used to have a single `enableLink` + `link`; they now have a `links` array.
 * On save, fold a legacy link into the front of `links` and turn `enableLink` off,
 * so old pages migrate the next time they're edited (no DB migration needed).
 */
export const migrateLegacyColumnLinks = (columns: Column[] | null | undefined) => {
  if (!Array.isArray(columns)) return columns

  return columns.map((col) => {
    if (!col?.enableLink || !col.link) return col
    return {
      ...col,
      enableLink: false,
      links: [{ link: col.link }, ...(col.links ?? [])],
    }
  })
}

export const migrateLegacyLinkHook: FieldHook = ({ value }) => migrateLegacyColumnLinks(value)
