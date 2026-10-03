import type { ArrayField } from 'payload'

import { EMBED_PROVIDERS, isEmbedProvider, normalizeEmbedUrl } from '../utilities/embeds'

const providerLabels: Record<(typeof EMBED_PROVIDERS)[number], string> = {
  youtube: 'YouTube',
  soundcloud: 'SoundCloud',
  mixcloud: 'Mixcloud',
}

export const embedsField: ArrayField = {
  name: 'embeds',
  type: 'array',
  admin: {
    description:
      'Audio and video for this page: YouTube, SoundCloud or Mixcloud embeds. Shown in this order.',
    initCollapsed: true,
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'type',
          type: 'select',
          admin: { width: '30%' },
          defaultValue: 'youtube',
          options: [...EMBED_PROVIDERS.map((value) => ({ label: providerLabels[value], value }))],
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          admin: { description: 'Optional heading shown above this embed.' },
        },
      ],
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'Paste the page URL or the full <iframe> embed code.',
      },
      hooks: {
        // Store only the canonical, allow-listed embed src - never raw iframe HTML.
        beforeChange: [
          ({ siblingData, value }) => {
            if (!isEmbedProvider(siblingData?.type)) return undefined
            return normalizeEmbedUrl(siblingData.type, value) ?? value
          },
        ],
      },
      validate: (value: string | null | undefined, { siblingData }: { siblingData: unknown }) => {
        const type = (siblingData as { type?: unknown } | undefined)?.type
        if (!isEmbedProvider(type)) return true
        if (!value) return 'A URL is required.'
        return normalizeEmbedUrl(type, value)
          ? true
          : `That doesn't look like a valid ${providerLabels[type]} URL or embed code.`
      },
    },
  ],
  label: 'Media embeds',
  labels: { plural: 'Media embeds', singular: 'Media embed' },
}
