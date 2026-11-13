import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

// Media is embedded all over (cards, heroes, blocks, paginated archives), and
// the referencing documents don't change when an image is edited or replaced,
// so their own revalidate hooks never fire. Bust the whole site on change.
// Creating new media can't affect existing pages, so it's skipped.
export const revalidateMedia: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation === 'update' && !req.context.disableRevalidate) {
    req.payload.logger.info(`Revalidating all pages after media change: ${doc?.id}`)
    revalidatePath('/', 'layout')
  }
  return doc
}

export const revalidateMediaDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (!req.context.disableRevalidate) {
    revalidatePath('/', 'layout')
  }
  return doc
}
