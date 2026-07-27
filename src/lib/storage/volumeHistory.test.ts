import { describe, it, expect } from 'vitest'
import { aggregateSamples, retentionCutoff } from './volumeHistory'

describe('aggregateSamples', () => {
  it('returns an empty array for no samples', () => {
    expect(aggregateSamples([], 60_000)).toEqual([])
  })

  it('groups samples into aligned buckets with min/avg/max', () => {
    const bucketMs = 1000
    const samples = [
      { timestamp: 100, db: 40 },
      { timestamp: 500, db: 60 },
      { timestamp: 900, db: 50 },
      { timestamp: 1200, db: 70 },
    ]
    const result = aggregateSamples(samples, bucketMs)
    expect(result).toEqual([
      { timestamp: 0, minDb: 40, maxDb: 60, avgDb: 50 },
      { timestamp: 1000, minDb: 70, maxDb: 70, avgDb: 70 },
    ])
  })

  it('sorts buckets chronologically regardless of input order', () => {
    const samples = [
      { timestamp: 5000, db: 30 },
      { timestamp: 100, db: 10 },
    ]
    const result = aggregateSamples(samples, 1000)
    expect(result.map((b) => b.timestamp)).toEqual([0, 5000])
  })
})

describe('retentionCutoff', () => {
  it('computes a cutoff N hours before now', () => {
    const now = 10 * 60 * 60 * 1000
    expect(retentionCutoff(6, now)).toBe(4 * 60 * 60 * 1000)
  })
})
