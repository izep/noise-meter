/**
 * Threshold violation event history: append-only log of discrete above-limit
 * episodes, with the same retention-based pruning strategy as other history.
 */
import { getDb, VIOLATION_STORE, type ViolationEventRecord } from './db'

export async function saveViolationEvent(event: ViolationEventRecord): Promise<void> {
  const db = await getDb()
  await db.add(VIOLATION_STORE, event)
}

export async function getViolationHistorySince(
  sinceTimestamp: number,
): Promise<ViolationEventRecord[]> {
  const db = await getDb()
  const range = IDBKeyRange.lowerBound(sinceTimestamp)
  return db.getAllFromIndex(VIOLATION_STORE, 'timestamp', range)
}

export async function pruneViolationOlderThan(cutoffTimestamp: number): Promise<number> {
  const db = await getDb()
  const range = IDBKeyRange.upperBound(cutoffTimestamp, true)
  const keys = await db.getAllKeysFromIndex(VIOLATION_STORE, 'timestamp', range)
  const tx = db.transaction(VIOLATION_STORE, 'readwrite')
  await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done])
  return keys.length
}
