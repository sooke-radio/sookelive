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
  // Legacy single link, superseded by `links`. Kept in the schema so existing data
  // can be read; migrateLegacyLinkHook moves it into `links` on read.
  {
    name: 'enableLink',
    type: 'checkbox',
    admin: { hidden: true },
  },
  link({
    overrides: {
      // `condition` (not `hidden`) so the link's required sub-fields aren't validated.
      admin: { condition: () => false },
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
        afterRead: [migrateLegacyLinkHook],
      },
      fields: columnFields,
    },
  ],
}
