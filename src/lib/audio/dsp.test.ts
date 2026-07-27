import { describe, it, expect } from 'vitest'
import { computeRms, rmsToDbfs, dbfsToApproxSpl, computeApproxDbSpl } from './dsp'

describe('computeRms', () => {
  it('is 0 for silence', () => {
    expect(computeRms(new Float32Array(100))).toBe(0)
  })

  it('is 0 for an empty buffer', () => {
    expect(computeRms(new Float32Array(0))).toBe(0)
  })

  it('is 1 for a full-scale DC signal', () => {
    expect(computeRms([1, 1, 1, 1])).toBeCloseTo(1)
  })

  it('computes RMS for a mixed signal', () => {
    expect(computeRms([1, -1, 1, -1])).toBeCloseTo(1)
    expect(computeRms([0.5, -0.5])).toBeCloseTo(0.5)
  })
})

describe('rmsToDbfs', () => {
  it('is 0 dBFS at full scale', () => {
    expect(rmsToDbfs(1)).toBeCloseTo(0)
  })

  it('is -Infinity for silence', () => {
    expect(rmsToDbfs(0)).toBe(-Infinity)
  })

  it('is negative below full scale', () => {
    expect(rmsToDbfs(0.5)).toBeLessThan(0)
  })
})

describe('dbfsToApproxSpl', () => {
  it('applies the calibration offset', () => {
    expect(dbfsToApproxSpl(-20, 100)).toBe(80)
  })

  it('treats non-finite dBFS (silence) as 0 before offset', () => {
    expect(dbfsToApproxSpl(-Infinity, 100)).toBe(0)
  })
})

describe('computeApproxDbSpl', () => {
  it('floors the result at 0', () => {
    expect(computeApproxDbSpl([0, 0, 0], 100)).toBe(0)
  })

  it('produces a plausible reading for a moderate signal', () => {
    const samples = Array.from({ length: 512 }, (_, i) => Math.sin(i / 4) * 0.3)
    const db = computeApproxDbSpl(samples, 100)
    expect(db).toBeGreaterThan(60)
    expect(db).toBeLessThan(100)
  })
})
