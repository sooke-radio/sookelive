import type { DashboardViewServerProps } from '@payloadcms/next/views'
import { DefaultDashboard, ListView } from '@payloadcms/next/views'
import { Card, Gutter, SetStepNav } from '@payloadcms/ui'
import type { AdminViewServerProps } from 'payload'
import Link from 'next/link'
import React from 'react'

import { getHostId } from '@/access/assignedShows'
import { isAdminUser } from '@/access/roles'

// The dashboard view is passed the full AdminViewServerProps under the hood
// (see @payloadcms/next's DashboardView), just typed narrowly as
// DashboardViewServerProps - widen it back out so we can hand the same props
// through to `ListView`, which needs `clientConfig`/`importMap`/`viewType`.
type Props = DashboardViewServerProps & AdminViewServerProps

export default async function HostDashboard(props: Props) {
  const { req } = props.initPageResult
  const { user } = req

  if (isAdminUser(user)) {
    return <DefaultDashboard {...props} />
  }

  const hostId = getHostId(user)

  if (!hostId) {
    return (
      <Gutter className="dashboard">
        <h1>Welcome</h1>
        <p>Your account isn&apos;t linked to a host profile yet. Contact an admin to get set up.</p>
      </Gutter>
    )
  }

  const [{ docs: shows }, host] = await Promise.all([
    req.payload.find({
      collection: 'shows',
      depth: 0,
      limit: 100,
      overrideAccess: false,
      req,
      sort: 'title',
      where: { hosts: { in: [hostId] } },
    }),
    req.payload.findByID({
      collection: 'hosts',
      id: hostId,
      overrideAccess: false,
      req,
    }),
  ])

  const showIds = shows.map((show) => show.id)

  // Reuse the real Episodes list view (same table, columns, sorting and
  // pagination as `/admin/collections/episodes`), just scoped to this host's
  // shows via `admin.baseFilter` on a cloned (not mutated) collection config.
  const episodesConfig = req.payload.collections.episodes.config
  const hostEpisodesConfig = {
    ...episodesConfig,
    admin: {
      ...episodesConfig.admin,
      baseFilter: async () => ({ show: { in: showIds } }),
    },
  }

  const episodesList = await ListView({
    ...props,
    enableRowSelections: true,
    initPageResult: {
      ...props.initPageResult,
      collectionConfig: hostEpisodesConfig,
      docID: undefined,
    },
    viewType: 'list',
  })

  return (
    <>
      <Gutter className="dashboard">
        <h1>Welcome, {host.title}</h1>

        <section style={{
          margin: '2.5rem 0px'
        }}>
          <h2>Your Host Profile</h2>
          <div
              style={{
              marginTop: '1em',
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            <Card
              key={host.id}
              href={`/admin/collections/hosts/${host.id}`}
              title={host.title}
              />
          </div>
        </section>

        <section style={{ marginBottom: '2.5rem' }}>
          <h2>Your Shows</h2>
          {shows.length === 0 ? (
            <p>No shows are assigned to you yet.</p>
          ) : (
            <div
                style={{
                marginTop: '1em',
                display: 'grid',
                gap: '1rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              }}
            >
              {shows.map((show) => (
                <Card
                  key={show.id}
                  href={`/admin/collections/shows/${show.id}`}
                  title={show.title + (show._status === 'draft' ? ' (Draft)' : '')}
                />
              ))}
            </div>
          )}
        </section>

        {showIds.length === 0 && <p>No episodes yet.</p>}
      </Gutter>

      {/* Not inside the Gutter above - DefaultListView (what `episodesList`
          renders) already wraps its table in its own Gutter, so nesting it
          in ours would double the left/right margins. */}
      {showIds.length > 0 && episodesList}

      {/* DefaultListView sets the shared breadcrumb ("step nav") to
          "Episodes" via a client effect with no cleanup, so embedding it
          above leaks that breadcrumb onto the dashboard itself. Reset it -
          placed after episodesList so this effect commits last and wins. */}
      <SetStepNav nav={[]} />
    </>
  )
}
