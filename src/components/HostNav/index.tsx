import { DefaultNav } from '@payloadcms/next/rsc'
import { NavHamburger, NavWrapper } from '@payloadcms/next/client'
import { Logout } from '@payloadcms/ui'
import type { PayloadRequest, ServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { isAdminUser } from '@/access/roles'

type Props = ServerProps & { req?: PayloadRequest }

const baseClass = 'nav'

// Hosts land on the dashboard (their own shows/episodes/profile), not the
// full admin nav - that nav would otherwise link to unfiltered Shows/
// Episodes/Hosts list views showing everyone's content, not just theirs.
// Keeps Logout, since it normally only lives inside the Nav sidebar.
export default function HostNav(props: Props) {
  if (isAdminUser(props.user)) {
    return <DefaultNav {...props} />
  }

  return (
    <NavWrapper baseClass={baseClass}>
      <nav className={`${baseClass}__wrap`}>
        <Link href="/admin" style={{ padding: 'var(--base) 0' }}>
          Dashboard
        </Link>
        <div className={`${baseClass}__controls`}>
          <Logout />
        </div>
      </nav>
      <div className={`${baseClass}__header`}>
        <div className={`${baseClass}__header-content`}>
          <NavHamburger baseClass={baseClass} />
        </div>
      </div>
    </NavWrapper>
  )
}
