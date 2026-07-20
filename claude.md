# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Sooke.live is a community radio station website. Next.js 15 (App Router) + PayloadCMS 3 + MongoDB, co-located in a single app.

## Development Commands

```bash
pnpm run dev              # Development server
pnpm run build            # Production build (requires MongoDB running)
pnpm run start            # Start production server
pnpm run lint             # ESLint
pnpm run lint:fix         # ESLint with auto-fix
pnpm run generate:types      # Regenerate src/payload-types.ts from collections
pnpm run generate:importmap  # Regenerate Payload admin import map
```

> `pnpm run build` requires MongoDB to be running — PayloadCMS connects to the DB during `next build`.

## Architecture

- **`src/app/(frontend)/`** — Public-facing Next.js pages (App Router)
- **`src/app/(payload)/`** — PayloadCMS admin UI and REST/GraphQL API routes
- **`src/collections/`** — PayloadCMS collection definitions (schema + hooks)
- **`src/blocks/`** — Reusable content block components used in page layouts
- **`src/components/`** — React components; `src/components/ui/` has Radix UI primitives
- **`src/stream/`** — Azuracast API client and Howler.js audio player
- **`src/tasks/`** — PayloadCMS scheduled tasks (Azuracast sync every 15 min in prod)
- **`src/payload.config.ts`** — Main Payload config
- **`src/payload-types.ts`** — Auto-generated types — **do not edit manually**

## Collections

| Collection | Notes |
|---|---|
| `pages` | Static content pages with block-based layout |
| `posts` | Blog posts with authors, categories, rich text |
| `shows` | Radio shows; linked to Azuracast playlists/streamers |
| `media` | Image/file uploads with multiple output sizes |
| `categories` | Post categories |
| `genres` | Show genres |
| `hosts` | Show hosts/presenters |
| `users` | Authenticated users (admin access only) |
| `playlists` | Read-only; synced from Azuracast API |

**Globals:** `Header`, `Footer`

## Key Patterns

**Populated authors:** Posts/Shows have an `authors` relationship field (access-locked) and a separate `populatedAuthors` array for display. The `populateAuthors` hook fills this on save.

**Revalidation:** Collections use `afterChange`/`afterDelete` hooks to call `revalidatePath()` and `revalidateTag()` to keep Next.js ISR cache in sync with CMS changes.

**Block system:** Pages use a `layout` blocks field. Available blocks: `TextBlock`, `CallToAction`, `Content`, `MediaBlock`, `ArchiveBlock`, `FormBlock`, `ScheduleBlock`. Rendered via `src/blocks/RenderBlocks.tsx`.

**Access control:** Three levels in `src/access/` — `anyone`, `authenticated`, `authenticatedOrPublished`.

**Azuracast:** Shows reference Azuracast playlist IDs and streamer IDs. The `syncAzuracast` task syncs the `Playlists` collection every 15 min in production. Set `ENABLE_JOBS=true` to run locally.

## TypeScript

- `strict: false`, `strictNullChecks: true`
- `no-unused-vars` and `no-explicit-any` ESLint rules are disabled — leave them off
- After changing collection schemas, run `pnpm run generate:types`

## Import Aliases

```ts
@/*             →  src/*
@payload-config →  src/payload.config.ts
```

## Styling

Tailwind CSS with CSS variable color tokens (`src/cssVariables.js`). Dark mode via `[data-theme="dark"]` selector. Radix UI primitives in `src/components/ui/`.

## Environment Variables

Required: `PAYLOAD_SECRET`, `CRON_SECRET`, `DATABASE_URI`, `AZURACAST_URL`, `AZURACAST_STATION_ID`, `AZURACAST_KEY`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Useful in dev: `NEXT_PUBLIC_STREAM_DISABLED=true`, `ENABLE_JOBS=true`

See `.env.example` for the full list.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) → self-hosted Docker server. Branch `stg` → staging, `prd` → production. The app is built on the server (not in CI) because Payload requires a live DB connection at build time. Secrets are injected into `.env` by the deploy workflow; non-secret vars come from the repo's `.env`.

## Commit Messages

Write commit messages and PR descriptions as a humble but experienced engineer would. Keep it casual, avoid listicles, briefly describe what we're doing and highlight non-obvious implementation choices but don't overthink it.

Don't embarrass me with robot speak, marketing buzzwords, or vague fluff. You're not writing a fucking pamphlet. Just leave a meaningful trace so someone can understand the choices later. Assume the reader is able to follow the code perfectly fine.
