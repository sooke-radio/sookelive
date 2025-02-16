import React from 'react'
import RichText from '@/components/RichText'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'

type Props = Extract<Page['layout'][0], { blockType: 'textBlock' }>

export const TextBlock: React.FC<
  {
    id?: string
  } & Props
> = (props) => {
  const { textBlocks } = props
  return (
    <div className="container my-16">
        {textBlocks &&
          textBlocks.length > 0 &&
          textBlocks.map((textBlock, index) => 
            {
              const { enableLink, link, richText } = textBlock
              return (
                <div className="" key={index}>
                {richText && <RichText data={richText} enableGutter={false} />}                  {enableLink && <CMSLink {...link} />}
                </div>
              )
          })}
    </div>
  )
}
