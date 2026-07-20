# Show/Playlist Title Linking (future plan, not yet fully designed)

## Context

`.claude/planning/update-audio-player.md` asks for the stream player to link back to the show page of the currently playing/scheduled show, and separately notes that DJ-entered live titles in Azuracast are often wrong, suggesting the scheduled show's title be substituted when a live user is connected during that timeslot.

This was split out of `.claude/planning/audio-player-quality-selector.md` (which covers quality selection, copy-URL, and the chat link only) so each concern gets its own focused design. Not yet implemented; this file records the intended scope and phasing for when it's picked up.

## Phase 1 — hyperlinked playlist titles

Display the currently-playing **playlist's** title (not the CMS `Shows.title` field) in the player, hyperlinked to the matching `/shows/[slug]` page. The display text stays exactly what Azuracast/the WebSocket already reports (`trackInfo.playlist`/`show`); only the link destination is new.

Needs a server-side resolution step — the client only has a playlist name / streamer id from the WebSocket (`src/stream/azuracast/nowplaying.tsx`), and matching that to a `Shows` doc (`stream_playlist.name` / `streamer_id`) requires a DB query. Groundwork already exists but is dormant:
- A commented-out `GET /resolve-show/:name` endpoint in `src/collections/Shows/index.ts` (lines ~281-324) doing exactly this match.
- `src/stream/player/getShowSlug.ts` — an unused duplicate of the same query, with a footgun module-level `getPayload()` call at import time. Retire this once the endpoint is resurrected.

Since only the `slug` is needed (display text comes from the playlist name the client already has), the endpoint's response can be minimal — just enough to resolve which Show, if any, matches the current playlist/streamer.

## Phase 2 — live titles

When a DJ is live, Azuracast's `live.streamer_name` is often mistyped or stale. Correct the displayed/linked show by matching "now" against the relevant Show's `stream_playlist[].schedule_items` slots rather than trusting the raw streamer name — i.e., prefer whatever Show is actually scheduled for this slot over what the DJ typed into Azuracast.

Needs its own design pass covering:
- **Timezone handling**: `ScheduleItem.start_time`/`end_time` (`src/schedule/schedule-common.ts`) are HHMM integers with no timezone info today — zero TZ handling exists anywhere in the schedule code. Azuracast's now-playing payload includes `station.timezone`, but nothing currently threads it anywhere.
- **Overnight-slot wraparound**: slots where `end_time < start_time` (e.g. 2200–0200) need explicit handling, and it's not yet confirmed whether Azuracast represents these as one entry or two adjacent-day entries — check a real overnight playlist's `schedule_items` during design.
- **Boundary semantics**: whether "now" exactly equal to `start_time`/`end_time` counts as inside or outside the slot.
- How this interacts with Phase 1's resolution endpoint/response shape (extend it, or design separately).
