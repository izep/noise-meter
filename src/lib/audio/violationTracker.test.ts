import { describe, it, expect } from 'vitest'
import { ThresholdViolationTracker } from './violationTracker'

describe('ThresholdViolationTracker', () => {
  it('does not emit an event for the first below-threshold sample', () => {
    const tracker = new ThresholdViolationTracker(65)
    expect(tracker.update(60, 1000)).toBeUndefined()
  })

  it('does not emit an event while a violation is still active', () => {
    const tracker = new ThresholdViolationTracker(65)
    expect(tracker.update(70, 1000)).toBeUndefined()
    expect(tracker.update(72, 1500)).toBeUndefined()
    expect(tracker.update(68, 2000)).toBeUndefined()
  })

  it('emits exactly one event when the reading drops back below the threshold', () => {
    const tracker = new ThresholdViolationTracker(65)

    tracker.update(70, 1000)
    tracker.update(75, 1500)

    expect(tracker.update(65, 2500)).toEqual({
      timestamp: 1000,
      peakDb: 75,
      durationMs: 1500,
    })
    expect(tracker.update(60, 3000)).toBeUndefined()
  })

  it('emits separate events for separate violation episodes', () => {
    const tracker = new ThresholdViolationTracker(65)

    tracker.update(67, 1000)
    const first = tracker.update(64, 1800)
    tracker.update(80, 2500)
    const second = tracker.update(63, 4000)

    expect(first).toEqual({ timestamp: 1000, peakDb: 67, durationMs: 800 })
    expect(second).toEqual({ timestamp: 2500, peakDb: 80, durationMs: 1500 })
  })

  it('applies an updated threshold to subsequent samples', () => {
    const tracker = new ThresholdViolationTracker(70)

    expect(tracker.update(68, 1000)).toBeUndefined()
    tracker.setThreshold(65)
    tracker.update(68, 1500)

    expect(tracker.update(64, 2500)).toEqual({
      timestamp: 1500,
      peakDb: 68,
      durationMs: 1000,
    })
  })

  it('flushes an open violation episode', () => {
    const tracker = new ThresholdViolationTracker(65)

    tracker.update(69, 1000)
    tracker.update(74, 2000)

    expect(tracker.flush(3500)).toEqual({
      timestamp: 1000,
      peakDb: 74,
      durationMs: 2500,
    })
    expect(tracker.flush(4000)).toBeUndefined()
  })
})
