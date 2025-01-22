import type { Block, Field } from 'payload'

import {
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  lexicalEditor,
  OrderedListFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'

import { link } from '@/fields/link'

const textFields: Field[] = [
  {
    name: 'richText',
    type: 'richText',
    editor: lexicalEditor({
      features: ({ defaultFeatures }) => {
        return [
          ...defaultFeatures,
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3', 'h4'] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
          OrderedListFeature(),
          UnorderedListFeature()
        ]
      },
    }),
    label: false,
  },
  {
    name: 'enableLink',
    type: 'checkbox',
  }
  ,
  link({
    overrides: {
      admin: {
        condition: (_, { enableLink }) => Boolean(enableLink),
      },
    },
  }),
]

export const TextBlock: Block = {
  slug: 'textBlock',
  fields: [
    {
      name: 'textBlocks',
      type: 'array',
      fields: textFields,
    },
  ],
}
