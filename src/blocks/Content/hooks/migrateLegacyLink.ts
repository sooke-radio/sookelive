import type { FieldHook } from 'payload'

type LinkData = Record<string, unknown> & { reference?: Record<string, unknown> | null }

type Column = {
  id?: string | null
  enableLink?: boolean | null
  link?: LinkData | null
  links?: unknown
  [k: string]: unknown
}

/**
 * Columns used to have a single `enableLink` + `link`; they now have a `links` array.
 * Runs on read (afterRead on the `columns` array, before Payload traverses the rows),
 * so the admin form and the frontend both see the legacy link as the first entry in
 * `links`, and the next save persists the migrated shape. No DB migration needed.
 */
export const migrateLegacyColumnLinks = (columns: unknown) => {
  if (!Array.isArray(columns)) return columns

  return columns.map((col: Column) => {
    if (!col?.enableLink || !col.link) return col

    const existing = Array.isArray(col.links) ? col.links : []
    // Copy the group and its reference: Payload populates relationships in place,
    // so sharing objects with the legacy `link` would populate the same object twice.
    const link = {
      ...col.link,
      reference: col.link.reference ? { ...col.link.reference } : col.link.reference,
    }

    return {
      ...col,
      enableLink: false,
      // Deterministic row id so the admin form sees a stable row across reloads.
      links: [{ id: `${col.id ?? 'column'}-legacy-link`, link }, ...existing],
    }
  })
}

export const migrateLegacyLinkHook: FieldHook = ({ value }) => migrateLegacyColumnLinks(value)
