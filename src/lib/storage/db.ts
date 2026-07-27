/**
 * IndexedDB schema/connection for the noise meter, using the `idb` wrapper
 * for a promise-based API. Three object stores: one for downsampled volume
 * history buckets, one for an append-only threshold violation log, and one
 * for an append-only movement event log.
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export const DB_NAME = 'noise-meter'
export const DB_VERSION = 2

export const VOLUME_STORE = 'volumeHistory' as const
export const VIOLATION_STORE = 'violationHistory' as const
export const MOVEMENT_STORE = 'movementHistory' as const

export interface VolumeBucketRecord {
  id?: number
  /** Bucket start time, ms epoch. */
  timestamp: number
  minDb: number
  avgDb: number
  maxDb: number
}

export interface MovementEventRecord {
  id?: number
  timestamp: number
  magnitude: number
  durationMs: number
}

export interface ViolationEventRecord {
  id?: number
  timestamp: number
  peakDb: number
  durationMs: number
}

export interface NoiseMeterDB extends DBSchema {
  [VOLUME_STORE]: {
    key: number
    value: VolumeBucketRecord
    indexes: { timestamp: number }
  }
  [VIOLATION_STORE]: {
    key: number
    value: ViolationEventRecord
    indexes: { timestamp: number }
  }
  [MOVEMENT_STORE]: {
    key: number
    value: MovementEventRecord
    indexes: { timestamp: number }
  }
}

let dbPromise: Promise<IDBPDatabase<NoiseMeterDB>> | undefined

export function getDb(): Promise<IDBPDatabase<NoiseMeterDB>> {
  if (!dbPromise) {
    dbPromise = openDB<NoiseMeterDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
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

        if (oldVersion < 2) {
          const violationStore = db.createObjectStore(VIOLATION_STORE, {
            keyPath: 'id',
            autoIncrement: true,
          })
          violationStore.createIndex('timestamp', 'timestamp')
        }
      },
    })
  }
  return dbPromise
}

/** Test-only: reset the cached connection handle so a fresh fake-indexeddb DB can be opened. */
export function resetDbConnection(): void {
  dbPromise = undefined
}
