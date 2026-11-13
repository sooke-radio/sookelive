import type { CollectionConfig } from 'payload'
import { imageOnly } from '@/fields/imageOnly'

import {
  BlocksFeature,
  FixedToolbarFeature,
  HeadingFeature,
  HorizontalRuleFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'

import { isAdmin } from '../../access/byRole'
import { isAdminOrPublished } from '../../access/isAdminOrPublished'
import { isAdminUser } from '../../access/roles'
import { Banner } from '../../blocks/Banner/config'
import { Code } from '../../blocks/Code/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
import { generatePreviewPath } from '../../utilities/generatePreviewPath'
import { populateAuthors } from './hooks/populateAuthors'
import { revalidateDelete, revalidatePost } from './hooks/revalidatePost'

import {
  MetaDescriptionField,
  MetaTitleField,
  OverviewField,
  PreviewField,
} from '@payloadcms/plugin-seo/fields'
import { createAutoMeta, thumbnailFallback } from '@/hooks/autoMeta'
import { slugField } from '@/fields/slug'

export const Posts: CollectionConfig<'posts'> = {
  slug: 'posts',
  access: {
    create: isAdmin,
    delete: isAdmin,
    read: isAdminOrPublished,
    update: isAdmin,
  },
  // This config controls what's populated by default when a post is referenced
  // https://payloadcms.com/docs/queries/select#defaultpopulate-collection-config-property
  // Type safe if the collection slug generic is passed to `CollectionConfig` - `CollectionConfig<'posts'>
  defaultPopulate: {
    title: true,
    slug: true,
    categories: true,
    meta: {
      image: true,
      description: true,
    },
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    hidden: ({ user }) => !isAdminUser(user),
    livePreview: {
      url: ({ data, req }) => {
        const path = generatePreviewPath({
          slug: typeof data?.slug === 'string' ? data.slug : '',
          collection: 'posts',
          req,
        })

        return path
      },
    },
    preview: (data, { req }) =>
      generatePreviewPath({
        slug: typeof data?.slug === 'string' ? data.slug : '',
        collection: 'posts',
        req,
      }),
    useAsTitle: 'title',
  },
  fields: [
    {
      // UI-only (no stored data): warns about losing a new doc's first unsaved edits
      // (drafts.validate defers creation until the first save; see versions below).
      name: 'unsavedNewDocWarning',
      type: 'ui',
      admin: { components: { Field: '@/components/UnsavedNewDocWarning' } },
    },
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
              filterOptions: imageOnly,
              relationTo: 'media',
              admin: {
                condition: ((_, { background } = {}) => background === 'media'),
              },
            },
            {
              name: 'thumbnail',
              type: 'upload',
              admin: {
                description:
                  'Used as the thumbnail on cards and as the social/SEO share image.',
              },
              label: 'Thumbnail image',
              filterOptions: imageOnly,
              relationTo: 'media',
            },
            {
              name: 'content',
              type: 'richText',
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                    BlocksFeature({ blocks: [Banner, Code, MediaBlock] }),
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
              name: 'relatedPosts',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              filterOptions: ({ id }) => {
                return {
                  id: {
                    not_in: [id],
                  },
                }
              },
              hasMany: true,
              relationTo: 'posts',
            },
            {
              name: 'categories',
              type: 'relationship',
              admin: {
                position: 'sidebar',
              },
              hasMany: true,
              relationTo: 'categories',
            },
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
              imagePath: 'thumbnail',
            }),
            MetaTitleField({
              hasGenerateFn: true,
            }),
            // Stored value only: edited via "Thumbnail image" on the Content tab and
            // mirrored here by the autoMeta hook.
            {
              name: 'image',
              type: 'upload',
              admin: { hidden: true },
              filterOptions: imageOnly,
              relationTo: 'media',
            },

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
    afterChange: [revalidatePost],
    afterRead: [populateAuthors, thumbnailFallback],
    beforeChange: [createAutoMeta('content')],
    afterDelete: [revalidateDelete],
  },
  versions: {
    drafts: {
      // Don't create a draft doc just by opening "Create New": Payload only
      // defers creation until the required fields are filled in when drafts validate.
      validate: true,
      autosave: {
        interval: 2000, // Live preview freshness vs. not fighting typing
      },
      schedulePublish: true,
    },
    maxPerDoc: 50,
  },
}
