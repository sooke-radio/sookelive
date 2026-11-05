/**
 * Counts real listening time and fires `onReached` once when `thresholdMs` of
 * playing time has accumulated. Time only advances between `start()` and
 * `stop()`, so seeking ahead can't fake it; a plain interval (not rAF) keeps
 * counting when the tab is in the background, where most listening happens.
 */
export const createListenTimer = (thresholdMs: number, onReached: () => void) => {
  const INTERVAL_MS = 1000
  let elapsed = 0
  let lastTick = 0
  let timer: ReturnType<typeof setInterval> | null = null
  let fired = false

  const stop = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }
  }

  const start = () => {
    if (fired || timer !== null) return
    lastTick = Date.now()
    timer = setInterval(() => {
      const now = Date.now()
      // Cap each step so a suspended/throttled timer can't add a huge jump.
      elapsed += Math.min(now - lastTick, 2 * INTERVAL_MS)
      lastTick = now
      if (elapsed >= thresholdMs) {
        fired = true
        stop()
        onReached()
      }
    }, INTERVAL_MS)
  }

  return { start, stop }
}
