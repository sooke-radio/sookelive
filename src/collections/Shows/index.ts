import type { CollectionConfig } from 'payload'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { authenticated } from '../../access/authenticated'
import { authenticatedOrPublished } from '../../access/authenticatedOrPublished'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { revalidateDelete, revalidateShow } from './hooks/revalidateShows'

import {
  MetaDescriptionField,
  MetaImageField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { slugField } from '@/fields/slug'
// import { populatePlaylists } from './hooks/populatePlaylists'

export const Shows: CollectionConfig<'shows'> = {
  slug: 'shows',
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublished,
    update: authenticated,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'shows'>
  defaultPopulate: {
    title: true,
    slug: true,
    genres: true,
    hosts: true,
    streamer_id: true,
    stream_playlist: true,
    meta: {
      image: true,
      description: true,
      title: true
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'shows',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'shows',
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
              name: 'background',
              type: 'select',
              defaultValue: 'gradient',
              label: 'Hero Background',
              options: [
                {
                  label: 'Gradient',
                  value: 'gradient',
                },
                {
                  label: 'Media',
                  value: 'media',
                },
              ]
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              admin: {
                condition: ((_, { background } = {}) => background === 'media'),
              },
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, MediaBlock] }),
                    FixedToolbarFeature(),
                    InlineToolbarFeature(),
                    HorizontalRuleFeature(),
                  ]
                },
              }),
              label: false,
              required: true,
            },
          ],
          label: 'Content',
        },
        {
          fields: [
            {
              name: 'genres',
              type: 'relationship',
              hasMany: true,
              relationTo: 'genres',
            },
            {
              name: 'hosts',
              type: 'relationship',
              hasMany: true,
              relationTo: 'hosts',
            },
            {
              name: 'stream_playlist',
              label: 'Stream Playlist',
              type: 'relationship',
              relationTo: 'playlists',
              hasMany: false,
              admin: {
                description: 'The playlist name of the show in Azuracast for pre-recorded shows. This is used to populate schedule data and link from the stream player. If your playlist is not loaded, refresh the playlists using the button in /admin/collections/playlists.',
              }
            },
            {
              name: 'streamer_id',
              label: 'Streamer ID',
              type: 'text',
              admin: {
                description: 'The streamer ID associated with this show in Azuracast for live streaming.',
              }
            }
          ],
          label: 'Meta',
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
              // if the `generateUrl` function is configured
              hasGenerateFn: true,

              // field paths to match the target field for data
              titlePath: 'meta.title',
              descriptionPath: 'meta.description',
            }),
          ],
        },
      ],
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
    {
      name: 'authors',
      type: 'relationship',
      admin: {
        position: 'sidebar',
      },
      hasMany: true,
      relationTo: 'users',
    },
    // This field is only used to populate the user data via the `populateAuthors` hook
    // This is because the `user` collection has access control locked to protect user privacy
    // GraphQL will also not return mutated user data that differs from the underlying schema
    {
      name: 'populatedAuthors',
      type: 'array',
      access: {
        update: () => false,
      },
      admin: {
        disabled: true,
        readOnly: true,
      },
      fields: [
        {
          name: 'id',
          type: 'text',
        },
        {
          name: 'name',
          type: 'text',
        },
      ],
    },
    ...slugField(),
  ],
  hooks: {
    afterChange: [revalidateShow],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      autosave: {
        interval: 100, // We set this interval for optimal live preview
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
  endpoints: [
    {
      path: '/resolve-show/:name',
      method: 'get',
      handler: async (req) => {
        try {
          const name = req.routeParams?.name;
          if(!name){
            throw new Error('No name provided');
          }          
          const response = await req.payload.find({
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
                    equals: name
                  }
                }
              ]
            },
            pagination: false,
            limit: 10
          })
          if(!response.docs.length){
            throw new Error('No show found');
          }
          
          return Response.json(response);
        } catch (error) {
          return Response.json({ 
            error: 'Failed to fetch show by playlist',
            message: error.message 
          });
        }
      }
    }
  ]
}
