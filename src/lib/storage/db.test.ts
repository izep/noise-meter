import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import {
  DB_NAME,
  DB_VERSION,
  MOVEMENT_STORE,
  VIOLATION_STORE,
  VOLUME_STORE,
  getDb,
  resetDbConnection,
} from './db'
import { saveBuckets, getHistorySince, pruneOlderThan } from './volumeHistory'
import {
  saveMovementEvent,
  getMovementHistorySince,
  pruneMovementOlderThan,
} from './movementHistory'
import {
  saveViolationEvent,
  getViolationHistorySince,
  pruneViolationOlderThan,
} from './violationHistory'

function resetFakeIndexedDb(): void {
  globalThis.indexedDB = new IDBFactory()
}

function createVersion1Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      const volumeStore = db.createObjectStore(VOLUME_STORE, {
        keyPath: 'id',
        autoIncrement: true,
      })
      volumeStore.createIndex('timestamp', 'timestamp')

      const movementStore = db.createObjectStore(MOVEMENT_STORE, {
        keyPath: 'id',
        autoIncrement: true,
      })
      movementStore.createIndex('timestamp', 'timestamp')
    }

    request.onsuccess = () => {
      request.result.close()
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}

describe('database schema (fake-indexeddb)', () => {
  beforeEach(() => {
    resetDbConnection()
    resetFakeIndexedDb()
  })

  it('opens a fresh database with the current version and all stores', async () => {
    const db = await getDb()

    expect(db.version).toBe(DB_VERSION)
    expect(db.objectStoreNames.contains(VOLUME_STORE)).toBe(true)
    expect(db.objectStoreNames.contains(VIOLATION_STORE)).toBe(true)
    expect(db.objectStoreNames.contains(MOVEMENT_STORE)).toBe(true)

    db.close()
  })

  it('upgrades a version-1 database by adding the violation store', async () => {
    await createVersion1Database()
    resetDbConnection()

    const db = await getDb()

    expect(db.version).toBe(DB_VERSION)
    expect(db.objectStoreNames.contains(VIOLATION_STORE)).toBe(true)

    db.close()
  })
})

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

describe('violation history storage (fake-indexeddb)', () => {
  beforeEach(() => {
    resetDbConnection()
    resetFakeIndexedDb()
  })

  it('saves and retrieves violation events since a timestamp', async () => {
    await saveViolationEvent({ timestamp: 1000, peakDb: 72, durationMs: 800 })
    await saveViolationEvent({ timestamp: 9000, peakDb: 75, durationMs: 1200 })
    const events = await getViolationHistorySince(2000)
    expect(events).toHaveLength(1)
    expect(events[0].timestamp).toBe(9000)
  })

  it('prunes violation events older than a cutoff', async () => {
    await saveViolationEvent({ timestamp: 1000, peakDb: 72, durationMs: 800 })
    await saveViolationEvent({ timestamp: 9000, peakDb: 75, durationMs: 1200 })
    const removed = await pruneViolationOlderThan(2000)
    expect(removed).toBe(1)
    const remaining = await getViolationHistorySince(0)
    expect(remaining).toHaveLength(1)
  })
})
