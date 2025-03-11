// TODO: move this to Shows collection and make it a cached endpoint.


import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })

const getShowSlug = async (name: string, streamerId?: string) => {
  const response = await payload.find({
    collection: 'shows',
    depth: 0,
    where: {
      or: [
        {
          'stream_playlist.name': {
            equals: name
          }
        },
        {
          'streamer_id': {
            equals: streamerId
          }
        }
      ]
    },
    pagination:false,
    limit: 10
  });
  return response;
};

export default getShowSlug;