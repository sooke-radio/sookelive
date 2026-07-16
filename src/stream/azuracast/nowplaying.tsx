import type { Dispatch, SetStateAction } from 'react';
import type { StreamMetadata } from '../player/types';
import type { AzuracastNowPlaying } from './types';

type NowPlayingSetter = Dispatch<SetStateAction<StreamMetadata>>;

let ws: WebSocket | null = null;
const listeners: Set<NowPlayingSetter> = new Set();
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

const NOWPLAYING_WS_URL = `${process.env.NEXT_PUBLIC_AZURACAST_URL}/api/live/nowplaying/websocket`.replace(
  /^http/,
  'ws',
);

const MAX_RECONNECT_DELAY_MS = 30_000;

function broadcast(update: StreamMetadata | ((prev: StreamMetadata) => StreamMetadata)) {
  listeners.forEach((listener) => listener(update));
}

function scheduleReconnect() {
  if (reconnectTimer || listeners.size === 0) return;
  const delay = Math.min(MAX_RECONNECT_DELAY_MS, 1000 * 2 ** reconnectAttempt);
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (listeners.size > 0) openSocket();
  }, delay);
}

function openSocket() {
  const socket = new WebSocket(NOWPLAYING_WS_URL);
  ws = socket;
  let currentTime = 0;

  socket.onopen = () => {
    reconnectAttempt = 0;
    socket.send(JSON.stringify({
      "subs": {
        "station:sookelive": {"recover": true}
      }
    }));
  };

  socket.onmessage = (e) => {
    const jsonData = JSON.parse(e.data);

    if ('connect' in jsonData) {
      const connectData = jsonData.connect;

      if ('data' in connectData) {
        // Legacy SSE data
        connectData.data.forEach(
          (initialRow: any) => handleSseData(initialRow)
        );
      } else {
        // New Centrifugo time format
        if ('time' in connectData) {
          currentTime = Math.floor(connectData.time / 1000);
        }

        // New Centrifugo cached NowPlaying initial push.
        for (const subName in connectData.subs) {
          const sub = connectData.subs[subName];
          if ('publications' in sub && sub.publications.length > 0) {
            sub.publications.forEach((initialRow: any) => handleSseData(initialRow, false));
          }
        }
      }
    } else if ('pub' in jsonData) {
      handleSseData(jsonData.pub);
    }

    function handleSseData(ssePayload: { data: { np: AzuracastNowPlaying; current_time: number } }, useTime = true) {
      const jsonData = ssePayload.data;


      if (useTime && 'current_time' in jsonData) {
        currentTime = jsonData.current_time;
      }

      const timeDiff = jsonData.current_time - jsonData.np.now_playing.played_at;
      const nowDiff = Date.now() - jsonData.current_time;


      // console.log(timeDiff, nowDiff, jsonData)

      // Mounts aren't part of the "now playing" sync delay below and rarely
      // change - broadcast them immediately so the player can start loading
      // audio without waiting on that delay too.
      const mounts = jsonData.np?.station?.mounts ?? [];
      broadcast((prev) => ({ ...prev, mounts }));

      let showName = 'Sooke Community Radio';
      let showSrc = '';

      function setShow() {
        if(jsonData.np?.live?.is_live && jsonData.np?.live?.stream_name) {
          showName = jsonData.np?.live?.streamer_name
          showSrc = '/shows/' + jsonData.np?.live?.streamer_name.replace(/[\s_]+/g, '-').toLowerCase()
        } else if (jsonData.np?.now_playing?.playlist) {
          showName = jsonData.np?.now_playing?.playlist
          showSrc = '/shows/' + jsonData.np?.now_playing?.playlist.replace(/[\s_]+/g, '-').toLowerCase()
        }
      }

      setShow();

      const trackData: StreamMetadata = {
        show: showName,
        showSrc: showSrc, // todo: find show src from /collections/shows
        title: jsonData.np?.now_playing?.song?.title || 'Loading...',
        artist: jsonData.np?.now_playing?.song?.artist || undefined,
        // pre-existing: `.name` assumes an object shape `playlist` doesn't have (it's a
        // string) so this always falls through to the default - out of scope here, see
        // .claude/planning/show-playlist-title-linking.md
        playlist: (jsonData.np?.now_playing?.playlist as unknown as { name?: string })?.name || 'Sooke Community Radio',
        live: jsonData.np?.live?.is_live || false,
        mounts,
      }
      // compensate for stream delay
      // TODO: make this better
      setTimeout(() => {
        broadcast(trackData);
      }, 1000);
    };
  };

  socket.onclose = () => {
    if (ws === socket) ws = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose always follows onerror for WebSocket, which schedules the
    // reconnect - nothing to do here beyond letting the browser close it.
  };
}

export const connectToWebSocket = (setNowPlaying: NowPlayingSetter) => {
  listeners.add(setNowPlaying);

  if (!ws) {
    openSocket();
  }

  return () => {
    listeners.delete(setNowPlaying);
    if (listeners.size === 0) {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (ws) {
        ws.close();
        ws = null;
      }
    }
  };
};

// Forces an immediate reconnect attempt, bypassing the backoff delay - for
// callers (e.g. the player's stall watchdog) that have an independent signal
// the connection is dead even though the socket hasn't fired onclose yet.
export const forceReconnectWebSocket = () => {
  reconnectAttempt = 0;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    const stale = ws;
    ws = null;
    stale.close();
  }
  if (listeners.size > 0) {
    openSocket();
  }
};
