# Audio Player Update: Quality Selector, Copy URL, Chat Link

## Context

`.claude/planning/update-audio-player.md` lists a set of UI/functionality upgrades for the site-wide stream player (`src/stream/player/index.client.tsx`), rendered inside `HeaderClient` (`src/Header/Component.client.tsx:69`). The player currently:

- plays a single, hardcoded stream mount (`high_192kbps.mp3`) with no quality choice
- has no way to copy the stream URL for use in external apps
- has no chat/Discord link at all
- has a dead `NEXT_PUBLIC_STREAM_DISABLED` check (computed, never used) and an empty stray file (`src/stream/player/audioStream.tsx`)

Verified against the live station (`https://stream.sooke.live/api/nowplaying/sookelive`): today there is exactly **one** mount (`"HQ Opus"`, format `opus`, bitrate 128, `is_default: true`, path `/high_192kbps.mp3` — a legacy path name, not actually MP3). The `low`/`low-mp3` mounts named in the planning doc **do not exist yet** — this plan reads mounts dynamically from `station.mounts` rather than hardcoding three options, so it works today (single mount) and automatically picks up more mounts once the operator adds them in Azuracast. **Operational prerequisite (not code):** create the additional Azuracast mounts (e.g. a low-bitrate Opus and an MP3 fallback for older iOS/Safari, which cannot decode Opus) before users see more than one option.

**Scope note — show/playlist linking moved out:** the planning doc's show-page-linking item (and its "live title override" refinement) is **not part of this plan**. It's tracked separately in `.claude/planning/show-playlist-title-linking.md`.

Goal: ship quality selection, copy-URL, and the chat link with minimal added UI surface, and clean up the dead code discovered along the way.

## Architecture decisions

1. **Mounts travel through the existing WebSocket feed, not a new fetch.** The Centrifugo now-playing payload (`jsonData.np`) already contains the full Azuracast now-playing object, which includes `station.mounts`. No new network call is needed — `nowplaying.tsx` just needs to read and forward `station.mounts` alongside the fields it already extracts.

2. **Type the now-playing payload properly.** Today `nowplaying.tsx` treats everything as `any`. Add a minimal type for the slice actually used (`station.mounts[]`, `live`, `now_playing`) rather than typing the whole Azuracast schema. This directly supports the quality selector (needs `mounts`) and removes a source of silent breakage.

3. **Chat URL lives on the `Header` global**, as a plain text field, not a new global. The player is rendered exclusively from `HeaderClient`, which already receives typed `Header` data as a prop (`src/Header/Component.tsx` → `getCachedGlobal('header', 1)()`) — no new fetch, no new revalidation wiring, `revalidateHeader` already fires `revalidateTag('global_header', ...)` on save. Adding a global would duplicate all of that for one URL field.

4. **UI stays a single overflow affordance.** Add one small icon button (settings/ellipsis, `lucide-react`) next to the existing play button that opens a compact popover-style panel (built with the existing Radix `select.tsx` primitive's patterns — Portal + Popper positioning — since `@radix-ui/react-popover`/`-dropdown-menu` aren't installed and adding a new dependency for one small menu isn't warranted) containing: quality radio/select list, "Copy stream URL" button, and the chat link (rendered only if set).

## File-by-file plan

### 1. Type the Azuracast now-playing payload

**New file `src/stream/azuracast/types.ts`**:
```ts
export interface AzuracastMount {
  id: number
  name: string
  url: string
  bitrate: number | null
  format: string
  is_default: boolean
  path: string
}

export interface AzuracastNowPlaying {
  station: {
    mounts: AzuracastMount[]
  }
  live: {
    is_live: boolean
    streamer_name: string
    stream_name?: string
  }
  now_playing: {
    played_at: number
    playlist: string
    song: { title: string; artist: string }
  }
  current_time: number
}
```

### 2. `src/stream/azuracast/nowplaying.tsx` — forward mounts, fix existing bugs

- Import `AzuracastNowPlaying` and type `jsonData` (the `.data` payload) with it instead of implicit `any`.
- Extend `StreamMetadata` (`src/stream/player/types.ts`) with:
  ```ts
  mounts?: AzuracastMount[]
  ```
- In `handleSseData`, set `mounts: jsonData.np?.station?.mounts ?? []` on `trackData`.
- Fix the module-level hardcoded `wss://stream.sooke.live/...` URL: derive it from `NEXT_PUBLIC_AZURACAST_URL` (same var the player already uses), e.g. ``NEXT_PUBLIC_AZURACAST_URL.replace(/^http/, 'ws') + '/api/live/nowplaying/websocket'``, so staging/local Azuracast instances aren't silently ignored.
- Leave the existing `showSrc`/`playlist` slugification logic (`setShow()`, the `now_playing.playlist?.name` line) untouched — it's out of scope here and belongs to `show-playlist-title-linking.md`.

### 3. `src/stream/player/index.client.tsx` — quality selection, copy URL

- **Remove** the hardcoded `streamSrc` `useState` (lines 35-38) and `format: ['mp3']` in the Howl config (line 51).
- **New state**: `selectedMountId: number | null`, initialized from `localStorage.getItem('sookelive:preferredMountId')` (guard for SSR/no-`window`). `mounts: AzuracastMount[]` comes from `trackInfo.mounts` (updates as the WS delivers now-playing data — the mount list itself won't change often, but there's no separate fetch to keep in sync with).
- **Derive the active mount**: `mounts.find(m => m.id === selectedMountId) ?? mounts.find(m => m.is_default) ?? mounts[0]`. Its `.url` (already a full URL per the verified payload, e.g. `https://stream.sooke.live/listen/sookelive/high_192kbps.mp3`) becomes the Howl `src`, with `?nocache=${Date.now()}` appended only for the *playing* URL — **not** for the copy-URL value.
- **Format hint**: derive Howler's `format` array from the active mount's `format` field (`'opus'` or `'mp3'`) instead of hardcoding `['mp3']`.
- **Switching quality mid-play**: when `selectedMountId` changes, if currently playing, call `unloadSound()` then `initializeSound(true)` (reuse existing helpers) so playback resumes on the new mount; if stopped, just update the src silently (no auto-play). Persist the new id to `localStorage`.
- **Copy stream URL**: button calls `navigator.clipboard.writeText(activeMount.url)` (no `?nocache`), with a brief "Copied!" state (plain `useState` + `setTimeout`, same pattern already used for the pause-unload timeout).
- **New small overflow panel** (new file `src/stream/player/QualityMenu.client.tsx` to keep `index.client.tsx` from growing unwieldy): a button (lucide `Settings2` or `MoreVertical`) that toggles a small absolutely-positioned panel containing:
  - a list of mounts as radio-style buttons (label = `mount.name`, e.g. "HQ Opus") — if `mounts.length <= 1`, hide this section entirely (nothing to choose from yet, per the operational prerequisite in Context)
  - "Copy stream URL" button
  - chat link (`<a href={chatUrl} target="_blank">`), rendered only if `chatUrl` (new prop, threaded from `HeaderClient` → `StreamPlayer`) is non-empty
  Style with existing Tailwind tokens used elsewhere in the player (`bg-black`/`text-secondary`/`bright` family) to match; no new UI dependency.
- **Fix `NEXT_PUBLIC_STREAM_DISABLED`**: in `HeaderClient` (`src/Header/Component.client.tsx:26,69`), fix the truthiness bug (`=== 'true'` not bare truthiness) and actually use it: `{!streamDisabled && <StreamPlayer chatUrl={data.chatUrl} />}`. This both fixes dead code flagged in exploration and is required to thread `chatUrl` through anyway.
- **Delete** `src/stream/player/audioStream.tsx` (confirmed empty, 0 bytes, unused).

### 4. `Header` global — add `chatUrl` field

In `src/Header/config.ts`, add a field alongside `navItems`:
```ts
{
  name: 'chatUrl',
  type: 'text',
  label: 'Chat / Discord URL',
  admin: {
    description: 'Shown as a chat link in the stream player. Leave blank to hide it.',
  },
},
```
No new hook needed — `revalidateHeader` already covers the whole global. Run `pnpm generate:types` after this change (per CLAUDE.md) so `Header['chatUrl']` appears in `src/payload-types.ts`; `src/Header/Component.tsx`'s prop passthrough is automatic since it already passes the whole `data: Header` object to `HeaderClient`.

### 5. Tests

**Unit (`src/**/*.spec.ts`, no DB):**
- `src/stream/player/mountSelection.spec.ts` (or inline logic tested via a small exported pure function `selectMount(mounts, preferredId)`): default-fallback behavior when preferred id is missing/stale (e.g. mount was removed from Azuracast since last visit), empty-mounts-array behavior.

**Manual verification** (dev server, per CLAUDE.md's cc-container note if applicable — otherwise `pnpm dev`):
1. Set `NEXT_PUBLIC_STREAM_DISABLED=false` locally, confirm the player renders and the fixed disabled-check doesn't break it.
2. Confirm the quality panel shows the single real "HQ Opus" mount today (no crash with `mounts.length === 1`), and that after an operator adds a second mount in Azuracast, it appears on next WS reconnect without a code change.
3. Play, switch mount mid-play, confirm playback resumes on the new mount (watch network tab for the new `/listen/...` request) and the choice persists across a page reload (`localStorage`).
4. Click "Copy stream URL", paste elsewhere, confirm it's the clean URL with no `?nocache=`.
5. Set/clear `chatUrl` on the `Header` global in `/admin`, confirm the chat link appears/disappears in the panel without a redeploy.

## Sequencing

1. Types + `nowplaying.tsx` fixes (mounts forwarding, WS URL from env) — no UI change yet, verify with console logging that `trackInfo.mounts` populates.
2. `Header` global `chatUrl` field + `pnpm generate:types`.
3. Player: mount selection state/localStorage, Howl src/format wiring, quality-switch-mid-play behavior.
4. Player: copy-URL button.
5. `QualityMenu.client.tsx` panel UI wiring everything together; delete `audioStream.tsx`; fix `NEXT_PUBLIC_STREAM_DISABLED`.
6. Manual verification pass (§5) end-to-end against the real staging Azuracast instance.
