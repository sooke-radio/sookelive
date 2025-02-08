'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { HeaderNav } from './Nav'
import { StreamPlayer } from '@/streamService/index.client'

interface HeaderClientProps {
  data: Header
}

export const HeaderClient: React.FC<HeaderClientProps> = ({ data }) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <header
      className="full  
        z-20 
        bg-black 
        border-r 
        border-l 
        border-t
        border-t-bright
        dark:border-t-bright
        flex-wrap 
        border-b-4 
        border-b-bright
        dark:border-b-bright"
      {...(theme ? { 'data-theme': theme } : {})}
    >
      <div className="container relative flex flex-wrap justify-between ">
        <div className='lg:w-3/5 w-full flex'>
          <div className="max-w-[280] flex items-center">
            <Link href="/">
              <Logo />
            </Link>
          </div>
          <div className="flex-1 p-6 ">
            <HeaderNav data={data} />
          </div>
        </div>
        <div className="lg:w-2/5 flex w-full items-center justify-center basis-full lg:basis-auto">
          <StreamPlayer  />
        </div>
      </div>


    </header>
  )
}
