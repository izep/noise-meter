import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { resetDbConnection } from './db'
import { saveBuckets, getHistorySince, pruneOlderThan } from './volumeHistory'
import {
  saveMovementEvent,
  getMovementHistorySince,
  pruneMovementOlderThan,
} from './movementHistory'

function resetFakeIndexedDb(): void {
  globalThis.indexedDB = new IDBFactory()
}

describe('volume history storage (fake-indexeddb)', () => {
  beforeEach(() => {
    resetDbConnection()
    resetFakeIndexedDb()
  })

  it('saves and retrieves buckets since a timestamp', async () => {
    await saveBuckets([
      { timestamp: 1000, minDb: 40, maxDb: 60, avgDb: 50 },
      { timestamp: 5000, minDb: 45, maxDb: 65, avgDb: 55 },
    ])
    const history = await getHistorySince(2000)
    expect(history).toHaveLength(1)
    expect(history[0].timestamp).toBe(5000)
  })

  it('prunes buckets older than a cutoff', async () => {
    await saveBuckets([
      { timestamp: 1000, minDb: 40, maxDb: 60, avgDb: 50 },
      { timestamp: 5000, minDb: 45, maxDb: 65, avgDb: 55 },
    ])
    const removed = await pruneOlderThan(2000)
    expect(removed).toBe(1)
    const remaining = await getHistorySince(0)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].timestamp).toBe(5000)
  })
})

describe('movement history storage (fake-indexeddb)', () => {
  beforeEach(() => {
    resetDbConnection()
    resetFakeIndexedDb()
  })

  it('saves and retrieves movement events since a timestamp', async () => {
    await saveMovementEvent({ timestamp: 1000, magnitude: 12, durationMs: 300 })
    await saveMovementEvent({ timestamp: 9000, magnitude: 15, durationMs: 400 })
    const events = await getMovementHistorySince(2000)
    expect(events).toHaveLength(1)
    expect(events[0].timestamp).toBe(9000)
  })

  it('prunes movement events older than a cutoff', async () => {
    await saveMovementEvent({ timestamp: 1000, magnitude: 12, durationMs: 300 })
    await saveMovementEvent({ timestamp: 9000, magnitude: 15, durationMs: 400 })
    const removed = await pruneMovementOlderThan(2000)
    expect(removed).toBe(1)
    const remaining = await getMovementHistorySince(0)
    expect(remaining).toHaveLength(1)
  })
})
