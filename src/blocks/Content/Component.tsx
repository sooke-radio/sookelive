import { cn } from '@/utilities/ui'
import React from 'react'
import RichText from '@/components/RichText'

import type { ContentBlock as ContentBlockProps } from '@/payload-types'

import { CMSLink } from '../../components/Link'

import { RenderBlocks } from '@/blocks/RenderBlocks'


export const ContentBlock: React.FC<ContentBlockProps> = (props) => {
  const { columns } = props

  const colsSpanClasses = {
    full: '12',
    half: '6',
    oneThird: '4',
    twoThirds: '8',
  }

  return (
    <div className="container my-16">
      <div className="grid grid-cols-4 lg:grid-cols-12 gap-y-8 gap-x-16">
        {columns &&
          columns.length > 0 &&
          columns.map((col, index) => {
            const { enableLink, link, links, richText, size, blocks } = col
            // Legacy single link renders until the page is next saved (see migrateLegacyLink).
            const allLinks = [...(enableLink && link ? [link] : []), ...(links ?? []).map((l) => l.link)]

            return (
              <div
                className={cn(`col-span-4 lg:col-span-${colsSpanClasses[size!]}`, {
                  'md:col-span-2': size !== 'full',
                })}
                key={index}
              >
                {richText && <RichText data={richText} enableGutter={false} />}
                
                {allLinks.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    {allLinks.map((l, i) => (
                      <CMSLink key={i} {...l} className="min-w-32" />
                    ))}
                  </div>
                )}

                {blocks && <RenderBlocks blocks={blocks} />}

              </div>
            )
          })}
      </div>
    </div>
  )
}
