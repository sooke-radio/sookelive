import { StreamMetadata } from '@/components/StreamPlayer/index.client'
import { set } from 'react-hook-form';

let ws: WebSocket | null = null;
let listeners: Set<(data: StreamMetadata) => void> = new Set();

export const connectToWebSocket = (setNowPlaying: (data: StreamMetadata) => void) => {
  listeners.add(setNowPlaying);

  if (!ws) {
    ws = new WebSocket('wss://stream.sooke.live/api/live/nowplaying/websocket');
    let currentTime = 0;

    ws.onopen = () => {
      console.log('WebSocket connection opened');
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
            (initialRow) => handleSseData(initialRow)
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
              sub.publications.forEach((initialRow) => handleSseData(initialRow, false));
            }
          }
        }
      } else if ('pub' in jsonData) {
        handleSseData(jsonData.pub);
      }

      function handleSseData(ssePayload, useTime = true) {
        const jsonData = ssePayload.data;
      
      
        if (useTime && 'current_time' in jsonData) {
          currentTime = jsonData.current_time;
        }
      
        console.log(jsonData)
      
        const trackData = {
          title: jsonData.np?.now_playing?.song?.title || 'Loading...',
          artist: jsonData.np?.now_playing?.song?.artist || 'SRS',
          show: jsonData.np?.now_playing?.playlist || 'Sooke Community Radio'
        }
      
        setNowPlaying(prevState => {
          if (trackData.title === prevState.title && 
            trackData.artist === prevState.artist && 
            trackData.show === prevState.show) {
            return prevState;
          }
          return {
            title: trackData.title || 'Loading...',
            artist: trackData.artist || 'SRS',
            show: trackData.show || 'Sooke Community Radio'
          }        
        })
        
      }
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
