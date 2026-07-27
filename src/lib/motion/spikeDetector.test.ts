import { describe, it, expect } from 'vitest'
import { magnitude, MovementSpikeDetector } from './spikeDetector'

describe('magnitude', () => {
  it('computes euclidean norm', () => {
    expect(magnitude({ x: 3, y: 4, z: 0 })).toBe(5)
  })

  it('is 0 for the zero vector', () => {
    expect(magnitude({ x: 0, y: 0, z: 0 })).toBe(0)
  })
})

describe('MovementSpikeDetector', () => {
  it('does not flag the first sample (establishes baseline)', () => {
    const detector = new MovementSpikeDetector(2)
    expect(detector.update(9.8)).toBe(false)
  })

  it('does not flag small fluctuations near gravity baseline', () => {
    const detector = new MovementSpikeDetector(2)
    detector.update(9.8)
    expect(detector.update(9.9)).toBe(false)
    expect(detector.update(9.7)).toBe(false)
  })

  it('flags a sudden large acceleration change as movement', () => {
    const detector = new MovementSpikeDetector(2)
    detector.update(9.8)
    expect(detector.update(15)).toBe(true)
  })

  it('keeps flagging while the spike is sustained', () => {
    const detector = new MovementSpikeDetector(2)
    detector.update(9.8)
    expect(detector.update(15)).toBe(true)
    expect(detector.update(15)).toBe(true)
  })

  it('stops flagging once values settle at a new baseline', () => {
    const detector = new MovementSpikeDetector(2, 0.5)
    detector.update(9.8)
    detector.update(9.8)
    for (let i = 0; i < 20; i++) {
      detector.update(9.8)
    }
    expect(detector.update(9.9)).toBe(false)
  })

  it('respects an updated sensitivity', () => {
    const detector = new MovementSpikeDetector(10)
    detector.update(9.8)
    expect(detector.update(15)).toBe(false)
    detector.setSensitivity(1)
    expect(detector.update(15)).toBe(true)
  })

  it('reset() clears the baseline so the next sample re-establishes it', () => {
    const detector = new MovementSpikeDetector(2)
    detector.update(9.8)
    detector.update(15)
    detector.reset()
    expect(detector.update(30)).toBe(false)
  })
})
