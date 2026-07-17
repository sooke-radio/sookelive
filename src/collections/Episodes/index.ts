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

// Admins see everything; hosts see published episodes plus episodes of
// their own assigned (possibly-draft) shows; everyone else sees published only.
const readEpisodes: Access = async ({ req }) => {
  const { user } = req
  if (isAdminUser(user)) return true

  const hostId = getHostId(user)
  if (hostId) {
    const showIds = await getAssignedShowIds(req)
    const hostOrPublished: Where = {
      or: [{ show: { in: showIds } }, { _status: { equals: 'published' } }],
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
