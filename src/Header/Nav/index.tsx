'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-center justify-center h-full w-full flex-wrap">
      {navItems.map(({ link }, i) => {
        return <CMSLink key={i} {...link} appearance="link" 
        className="text-xl xs:text-2xl text-secondary dark:text-primary text-center"
        />
      })}
      {/* <Link href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </Link> */}
    </nav>
  )
}
