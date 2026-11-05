type UmamiWindow = Window & {
  umami?: { track: (name: string, data?: Record<string, string | number | boolean>) => void }
}

/**
 * Sends a custom Umami event. A silent no-op when Umami isn't loaded (it is only
 * injected in production, and ad-blockers may strip it) so callers never need
 * to guard or handle errors.
 */
export const trackEvent = (name: string, data?: Record<string, string | number | boolean>): void => {
  try {
    if (typeof window === 'undefined') return
    ;(window as UmamiWindow).umami?.track(name, data)
  } catch {
    // Analytics must never break playback.
  }
}
