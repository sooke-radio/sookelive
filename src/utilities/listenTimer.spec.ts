import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createListenTimer } from './listenTimer'

describe('createListenTimer', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('fires once after the threshold of continuous playing', () => {
    const onReached = vi.fn()
    const timer = createListenTimer(30_000, onReached)
    timer.start()
    vi.advanceTimersByTime(29_000)
    expect(onReached).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(onReached).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_000)
    expect(onReached).toHaveBeenCalledTimes(1)
  })

  it('only counts time between start and stop (pauses do not count)', () => {
    const onReached = vi.fn()
    const timer = createListenTimer(30_000, onReached)
    timer.start()
    vi.advanceTimersByTime(20_000)
    timer.stop()
    vi.advanceTimersByTime(120_000) // paused for two minutes
    expect(onReached).not.toHaveBeenCalled()
    timer.start()
    vi.advanceTimersByTime(9_000)
    expect(onReached).not.toHaveBeenCalled()
    vi.advanceTimersByTime(2_000)
    expect(onReached).toHaveBeenCalledTimes(1)
  })

  it('ignores repeated start calls', () => {
    const onReached = vi.fn()
    const timer = createListenTimer(5_000, onReached)
    timer.start()
    timer.start()
    vi.advanceTimersByTime(6_000)
    expect(onReached).toHaveBeenCalledTimes(1)
  })
})
