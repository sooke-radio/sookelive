import type { Model } from 'mongoose'
import { getPayload } from 'payload'

import config from '@payload-config'

import { normalizeEmbedUrl } from '../utilities/embeds'

// Run with: pnpm payload run ./src/scripts/migrate-episode-embeds.ts
// Run BEFORE deploying the removal of the legacy `mixcloudUrl` episode field.
// That field is gone from the typed config, so this works on the raw Mongo
// documents (published docs and their version snapshots). Idempotent: only
// touches documents whose `embeds` is empty. The Mixcloud src becomes a
// `mixcloud` row; the `audio` upload field is unchanged and needs no migration.
type Legacy = { embeds?: unknown[] | null; mixcloudUrl?: string | null }

const migrateModel = async (
  model: Model<any>,
  prefix: '' | 'version.',
  log: { info: (msg: string) => void; warn: (msg: string) => void },
): Promise<number> => {
  const docs = (await model
    .find({ [`${prefix}mixcloudUrl`]: { $exists: true, $nin: [null, ''] } })
    .lean()) as Array<Record<string, any>>

  let migrated = 0
  for (const doc of docs) {
    const data: Legacy = prefix ? doc.version : doc
    if (Array.isArray(data.embeds) && data.embeds.length > 0) continue

    const embeds: Array<Record<string, unknown>> = []
    if (data.mixcloudUrl) {
      const url = normalizeEmbedUrl('mixcloud', data.mixcloudUrl)
      if (url) embeds.push({ type: 'mixcloud', url })
      else
        log.warn(
          `migrate-episode-embeds: unrecognised mixcloudUrl on ${String(doc._id)}: ${data.mixcloudUrl}`,
        )
    }

    if (embeds.length === 0) continue

    await model.updateOne({ _id: doc._id }, { $set: { [`${prefix}embeds`]: embeds } })
    migrated++
  }
  return migrated
}

const run = async () => {
  const payload = await getPayload({ config })
  const db = payload.db as unknown as {
    collections: Record<string, Model<any>>
    versions: Record<string, Model<any>>
  }

  const docs = await migrateModel(db.collections['episodes'], '', payload.logger)
  const versions = await migrateModel(db.versions['episodes'], 'version.', payload.logger)

  payload.logger.info(
    `migrate-episode-embeds: migrated ${docs} episode(s) and ${versions} version snapshot(s)`,
  )
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
