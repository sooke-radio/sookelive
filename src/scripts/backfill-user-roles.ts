import { getPayload } from 'payload'

import config from '@payload-config'

// Run with: pnpm payload run ./src/scripts/backfill-user-roles.ts
// Idempotent: only touches users with no roles set. Existing users predate
// the roles system and were all effectively admins, so they backfill to 'admin'
// rather than the least-privilege 'host' default new users get.
const run = async () => {
  const payload = await getPayload({ config })

  const { docs: users } = await payload.find({
    collection: 'users',
    where: {
      or: [{ roles: { exists: false } }, { roles: { equals: [] } }],
    },
    limit: 0,
  })

  if (users.length === 0) {
    payload.logger.info('backfill-user-roles: no users missing roles, nothing to do')
    return
  }

  for (const user of users) {
    await payload.update({
      collection: 'users',
      id: user.id,
      data: { roles: ['admin'] },
    })
    payload.logger.info(`backfill-user-roles: set roles=['admin'] on ${user.email} (${user.id})`)
  }

  payload.logger.info(`backfill-user-roles: backfilled ${users.length} user(s)`)
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
