import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import type { Episode } from '../../../payload-types'

type Ref = string | { id: string } | null | undefined

const toId = (ref: Ref): string | undefined => {
  if (!ref) return undefined
  return typeof ref === 'object' ? ref.id : ref
}

/**
 * Recomputes an audio file's `show` list from the episodes that currently use
 * it (the union of their shows). Writes only when the set actually changed.
 */
export const syncAudioShows = async (audioRef: Ref, req: PayloadRequest): Promise<void> => {
  const audioId = toId(audioRef)
  if (!audioId) return

  const { payload } = req

  const audio = await payload
    .findByID({ collection: 'episode-audio', id: audioId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!audio) return // deleted or never existed - nothing to sync

  const episodes = await payload.find({
    collection: 'episodes',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    select: { show: true },
    where: { audio: { equals: audioId } },
  })

  const shows = [...new Set(episodes.docs.map((e) => toId(e.show as Ref)).filter(Boolean))] as string[]
  const current = ((audio.show ?? []) as Ref[]).map(toId).filter(Boolean) as string[]

  const unchanged =
    shows.length === current.length && [...shows].sort().join() === [...current].sort().join()
  if (unchanged) return

  await payload.update({
    collection: 'episode-audio',
    id: audioId,
    data: { show: shows },
    depth: 0,
    overrideAccess: true, // `show` is system-managed (field access blocks users)
    // Deliberately no `req`: it would carry the saving user into this update, and
    // the audio's `uploadedBy` default (the current user) would then be applied.
  })
}

export const syncAudioShowsOnChange: CollectionAfterChangeHook<Episode> = async ({
  doc,
  previousDoc,
  req,
}) => {
  await syncAudioShows(doc.audio as Ref, req)

  // Audio swapped out: the old file may no longer belong to this episode's show.
  const previousAudio = toId(previousDoc?.audio as Ref)
  if (previousAudio && previousAudio !== toId(doc.audio as Ref)) {
    await syncAudioShows(previousAudio, req)
  }
  return doc
}

export const syncAudioShowsOnDelete: CollectionAfterDeleteHook<Episode> = async ({ doc, req }) => {
  if (doc) await syncAudioShows(doc.audio as Ref, req)
  return doc
}
