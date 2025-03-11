import type { StreamMetadata } from '../player/types';

let ws: WebSocket | null = null;
const listeners: Set<(data: StreamMetadata) => void> = new Set();

export const connectToWebSocket = (setNowPlaying: (data: StreamMetadata) => void) => {
  listeners.add(setNowPlaying);

  if (!ws) {
    ws = new WebSocket('wss://stream.sooke.live/api/live/nowplaying/websocket');
    let currentTime = 0;

    ws.onopen = () => {
      // console.log('WebSocket connection opened');
      ws?.send(JSON.stringify({
        "subs": {
          "station:sookelive": {"recover": true}
        }
      }));
    };

    ws.onmessage = (e) => {
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

      function handleSseData(ssePayload: { data: any; }, useTime = true) {
        const jsonData = ssePayload.data;
      
      
        if (useTime && 'current_time' in jsonData) {
          currentTime = jsonData.current_time;
        }

        const timeDiff = jsonData.current_time - jsonData.np.now_playing.played_at;
        const nowDiff = Date.now() - jsonData.current_time;

      
        console.log(timeDiff, nowDiff, jsonData)

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
          artist: jsonData.np?.now_playing?.song?.artist || null,
          playlist: jsonData.np?.now_playing?.playlist?.name || 'Sooke Community Radio',
          live: jsonData.np?.live?.is_live || false,
        }
        // compensate for stream delay
        // TODO: make this better
        setTimeout(() => {
          setNowPlaying(trackData);
        }, 1000);
      };
    };
  }

  return () => {
    listeners.delete(setNowPlaying);
    if (listeners.size === 0 && ws) {
      ws.close();
      ws = null;
    }
  };
};
