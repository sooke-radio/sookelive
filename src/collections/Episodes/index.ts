import type { Access, CollectionConfig, Where } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { getAssignedShowIds, getHostId, isAdminOrEpisodeOfAssignedShow } from '../../access/assignedShows'
import { isAdminOrHost } from '../../access/byRole'
import { isAdminUser } from '../../access/roles'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { enforceShowOwnership } from './hooks/enforceShowOwnership'
import { revalidateDelete, revalidateEpisode } from './hooks/revalidateEpisode'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'

const extractMixcloudSrc = ({ value }: { value?: unknown }) => {
  if (typeof value !== 'string' || !value.trim()) return value
  const srcMatch = value.match(/src="([^"]+)"/)
  return srcMatch ? srcMatch[1] : value
}

// Admins see everything; hosts see published episodes, episodes of their own
// assigned (possibly-draft) shows, and their own still-showless drafts (an
// episode autosaved before `show` is picked - see the `createdBy` field);
// everyone else sees published only.
const readEpisodes: Access = async ({ req }) => {
  const { user } = req
  if (isAdminUser(user)) return true

  const hostId = getHostId(user)
  if (hostId && user) {
    const showIds = await getAssignedShowIds(req)
    const hostOrPublished: Where = {
      or: [
        { show: { in: showIds } },
        { _status: { equals: 'published' } },
        { and: [{ show: { exists: false } }, { createdBy: { equals: user.id } }] },
      ],
    }
    return hostOrPublished
  }

  const publishedOnly: Where = {
    _status: {
      equals: 'published',
    },
  }
  return publishedOnly
}

export const Episodes: CollectionConfig<'episodes'> = {
  slug: 'episodes',
  access: {
    create: isAdminOrHost,
    delete: isAdminOrEpisodeOfAssignedShow,
    read: readEpisodes,
    update: isAdminOrEpisodeOfAssignedShow,
  },
  defaultPopulate: {
    title: true,
    slug: true,
    show: true,
    dateAired: true,
    mixcloudUrl: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'show', 'dateAired', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'episodes',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'episodes',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      type: 'tabs',
      tabs: [
        {
          fields: [
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
            },
            {
              name: 'description',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
            },
            {
              name: 'audio',
              type: 'upload',
              admin: {
                description: 'The audio file for this episode.',
              },
              relationTo: 'episode-audio',
            },
            {
              name: 'mixcloudUrl',
              label: 'Mixcloud Embed',
              type: 'text',
              admin: {
                description:
                  'Paste the Mixcloud embed src URL or the full <iframe> embed code. Stand-in audio player until file uploads (audio field, above) are wired up to storage.',
              },
              hooks: {
                beforeChange: [extractMixcloudSrc],
              },
            },
            {
              name: 'tracklist',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'artist',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'title',
                      type: 'text',
                      required: true,
                    },
                    {
                      name: 'startTime',
                      type: 'text',
                      admin: {
                        description: 'e.g. 1:23:45',
                        width: '20%',
                      },
                    },
                  ],
                },
              ],
              label: 'Tracklist',
            },
          ],
          label: 'Content',
        },
        {
          name: 'meta',
          label: 'SEO',
          fields: [
            OverviewField({
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
              imagePath: 'meta.image',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            MetaImageField({
              relationTo: 'media',
            }),
            MetaDescriptionField({}),
            PreviewField({
              hasGenerateFn: true,
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
    },
    {
      name: 'show',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      filterOptions: ({ req: { user } }) => {
        if (isAdminUser(user)) return true

        const hostId = getHostId(user)
        if (!hostId) return false

        return {
          hosts: {
            in: [hostId],
          },
        }
      },
      index: true,
      relationTo: 'shows',
      required: true,
    },
    {
      name: 'dateAired',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        description: 'The date this episode aired, or will air.',
        position: 'sidebar',
      },
      required: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
        position: 'sidebar',
      },
      hooks: {
        beforeChange: [
          ({ siblingData, value }) => {
            if (siblingData._status === 'published' && !value) {
              return new Date()
            }
            return value
          },
        ],
      },
    },
    // Lets a host read/update/delete their own episode while it's still a
    // showless draft (autosave can persist one before `show` is picked,
    // and `show` isn't required until publish) - without this, readEpisodes
    // and isAdminOrEpisodeOfAssignedShow have no way to recognize it as
    // theirs, so the host gets a false "document not found" right after
    // creating it. Always server-set, never client-writable.
    {
      // Plain text (not a `relationship`) since it's only ever compared for
      // equality in access control, never populated/displayed - and a
      // relationship would require every acting user to be a real Users doc.
      name: 'createdBy',
      type: 'text',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        hidden: true,
      },
      hooks: {
        beforeChange: [
          ({ operation, req, value }) => {
            if (operation === 'create') {
              return req.user ? String(req.user.id) : undefined
            }
            return value
          },
        ],
      },
    },
    ...slugField('title', { slugOverrides: { unique: true } }),
  ],
  hooks: {
    afterChange: [revalidateEpisode],
    afterDelete: [revalidateDelete],
    beforeChange: [populatePublishedAt],
    beforeValidate: [enforceShowOwnership],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 2000,
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
