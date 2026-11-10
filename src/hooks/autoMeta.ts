import type { CollectionAfterReadHook, CollectionBeforeChangeHook } from 'payload'

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

const MAX_DESCRIPTION = 160

type Doc = Record<string, any>

export const generateMetaTitle = (doc?: Doc | null): string =>
  typeof doc?.title === 'string' ? doc.title.trim() : ''

export const generateMetaDescription = (doc: Doc | null | undefined, field: string): string => {
  const source = doc?.[field]
  if (!source) return ''
  const text = convertLexicalToPlaintext({ data: source }).replace(/\s+/g, ' ').trim()
  if (text.length <= MAX_DESCRIPTION) return text
  const cut = text.slice(0, MAX_DESCRIPTION - 1)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 0 ? cut.lastIndexOf(' ') : cut.length).trimEnd()}…`
}

// A value is "auto" when it's empty or still equals what we generated from the
// previous version of the doc; anything else was typed by an editor, so keep it.
const resolveAuto = (current: unknown, previousAuto: string, nextAuto: string): string => {
  const value = typeof current === 'string' ? current.trim() : ''
  return !value || value === previousAuto ? nextAuto : value
}

/**
 * Keeps SEO title/description following the doc's title and `descriptionField`
 * (a richText field) until an editor overrides them, and mirrors `thumbnail`
 * into `meta.image` (what Cards, the SEO preview and `generateMeta` read).
 */
export const createAutoMeta =
  (descriptionField: string): CollectionBeforeChangeHook =>
  ({ data, originalDoc }) => {
    const meta: Doc = { ...(data.meta ?? {}) }
    const merged = { ...originalDoc, ...data }

    meta.title = resolveAuto(
      meta.title ?? originalDoc?.meta?.title,
      generateMetaTitle(originalDoc),
      generateMetaTitle(merged),
    )
    meta.description = resolveAuto(
      meta.description ?? originalDoc?.meta?.description,
      generateMetaDescription(originalDoc, descriptionField),
      generateMetaDescription(merged, descriptionField),
    )

    // `undefined` = field not sent (e.g. API create with only meta.image): leave meta.image alone.
    if (data.thumbnail !== undefined) meta.image = data.thumbnail

    return { ...data, meta }
  }

// Docs saved before `thumbnail` existed keep their image in meta.image; surface it
// so the admin shows it and the next save writes both fields.
export const thumbnailFallback: CollectionAfterReadHook = ({ doc }) => {
  if (!doc.thumbnail && doc.meta?.image) doc.thumbnail = doc.meta.image
  return doc
}
