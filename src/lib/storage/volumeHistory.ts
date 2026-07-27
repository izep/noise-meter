/**
 * Volume history: downsamples raw dB readings into fixed-width time buckets
 * (min/avg/max) for compact long-term storage, and prunes old buckets past
 * the configured retention window.
 */
import { getDb, VOLUME_STORE, type VolumeBucketRecord } from './db'

export interface RawSample {
  timestamp: number
  db: number
}

/**
 * Groups raw samples into `bucketMs`-wide buckets aligned to epoch time,
 * producing min/avg/max per bucket. Pure function, no IndexedDB access.
 */
export function aggregateSamples(samples: RawSample[], bucketMs: number): VolumeBucketRecord[] {
  if (samples.length === 0 || bucketMs <= 0) return []

  const buckets = new Map<number, number[]>()
  for (const { timestamp, db } of samples) {
    const bucketStart = Math.floor(timestamp / bucketMs) * bucketMs
    const values = buckets.get(bucketStart) ?? []
    values.push(db)
    buckets.set(bucketStart, values)
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a - b)
    .map(([timestamp, values]) => ({
      timestamp,
      minDb: Math.min(...values),
      maxDb: Math.max(...values),
      avgDb: values.reduce((sum, v) => sum + v, 0) / values.length,
    }))
}

export async function saveBucket(bucket: VolumeBucketRecord): Promise<void> {
  const db = await getDb()
  await db.add(VOLUME_STORE, bucket)
}

export async function saveBuckets(buckets: VolumeBucketRecord[]): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(VOLUME_STORE, 'readwrite')
  await Promise.all([...buckets.map((bucket) => tx.store.add(bucket)), tx.done])
}

export async function getHistorySince(sinceTimestamp: number): Promise<VolumeBucketRecord[]> {
  const db = await getDb()
  const range = IDBKeyRange.lowerBound(sinceTimestamp)
  return db.getAllFromIndex(VOLUME_STORE, 'timestamp', range)
}

export async function pruneOlderThan(cutoffTimestamp: number): Promise<number> {
  const db = await getDb()
  const range = IDBKeyRange.upperBound(cutoffTimestamp, true)
  const keys = await db.getAllKeysFromIndex(VOLUME_STORE, 'timestamp', range)
  const tx = db.transaction(VOLUME_STORE, 'readwrite')
  await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done])
  return keys.length
}

/** Retention cutoff timestamp (ms epoch) for a given retention window in hours. */
export function retentionCutoff(retentionHours: number, now = Date.now()): number {
  return now - retentionHours * 60 * 60 * 1000
}
