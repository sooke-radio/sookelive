import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
  AlignFeature,
  UnorderedListFeature,
  OrderedListFeature,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'
import { linkGroup } from '@/fields/linkGroup'

import { migrateLegacyLinkHook } from './hooks/migrateLegacyLink'

import { Archive } from '../../blocks/ArchiveBlock/config'
import { CallToAction } from '../../blocks/CallToAction/config'
import { FormBlock } from '../../blocks/Form/config'
import { MediaBlock } from '../../blocks/MediaBlock/config'
// import { Content as ContentBlock } from '../../blocks/Content/config'

const columnFields: Field[] = [
  {
    name: 'size',
    type: 'select',
    defaultValue: 'oneThird',
    options: [
      {
        label: 'One Third',
        value: 'oneThird',
      },
      {
        label: 'Half',
        value: 'half',
      },
      {
        label: 'Two Thirds',
        value: 'twoThirds',
      },
      {
        label: 'Full',
        value: 'full',
      },
    ],
  },
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ rootFeatures }) => {
        return [
          ...rootFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
          AlignFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
        ]
      },
    }),
    label: false,
  },
  linkGroup({
    overrides: {
      admin: {
        description: 'Buttons shown side by side under the text.',
      },
    },
  }),
  // Legacy single link, superseded by `links`. Only shown for columns that still
  // have it enabled; migrateLegacyLinkHook moves it into `links` on save.
  {
    name: 'enableLink',
    type: 'checkbox',
    label: 'Legacy link (moves into Links on save)',
    admin: {
      condition: (_, siblingData) => Boolean(siblingData?.enableLink),
    },
  },
  link({
    overrides: {
      admin: {
        condition: (_, siblingData) => Boolean(siblingData?.enableLink),
      },
    },
  }),
  {
    name: 'blocks',
    type: 'blocks',
    blocks: [CallToAction, MediaBlock, Archive, FormBlock],
    admin: {
      initCollapsed: true,
    },
  },
]

export const Content: Block = {
  slug: 'content',
  interfaceName: 'ContentBlock',
  fields: [
    {
      name: 'columns',
      type: 'array',
      admin: {
        initCollapsed: true,
      },
      hooks: {
        beforeValidate: [migrateLegacyLinkHook],
      },
      fields: columnFields,
    },
  ],
}
