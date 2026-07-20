import type { Endpoint } from 'payload'
import { revalidatePath } from 'next/cache'
import { isAuthenticatedOrCronSecret } from '@/access/isAuthenticatedOrCronSecret'

// Busts every statically-rendered page in one call. Needed after anything
// that changes content without going through Payload's application layer -
// e.g. bin/sync-prd-to-stg.sh's mongorestore, which swaps the whole database
// directly and so never fires the collections' afterChange revalidate hooks
// (revalidatePath/revalidateTag only run on real Payload document
// mutations).
export const revalidateAllEndpoint: Endpoint = {
  path: '/revalidate-all',
  method: 'post',
  handler: async (req) => {
    if (!isAuthenticatedOrCronSecret(req)) {
      return Response.json({ error: 'forbidden' }, { status: 401 })
    }

    revalidatePath('/', 'layout')

    return Response.json({ success: true })
  },
}
