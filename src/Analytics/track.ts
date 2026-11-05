type UmamiEventData = Record<string, string | number | boolean>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: UmamiEventData) => void }
  }
}

// No-op when Umami isn't configured, is still loading, or is blocked by the visitor.
export const trackEvent = (event: string, data?: UmamiEventData): void => {
  if (typeof window === 'undefined') return
  try {
    window.umami?.track(event, data)
  } catch {
    // analytics must never break playback
  }
}
