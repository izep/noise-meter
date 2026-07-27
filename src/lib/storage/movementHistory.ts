/**
 * Movement event history: append-only log of detected movement events,
 * with the same retention-based pruning strategy as volume history.
 */
import { getDb, MOVEMENT_STORE, type MovementEventRecord } from './db'

export async function saveMovementEvent(event: MovementEventRecord): Promise<void> {
  const db = await getDb()
  await db.add(MOVEMENT_STORE, event)
}

export async function getMovementHistorySince(
  sinceTimestamp: number,
): Promise<MovementEventRecord[]> {
  const db = await getDb()
  const range = IDBKeyRange.lowerBound(sinceTimestamp)
  return db.getAllFromIndex(MOVEMENT_STORE, 'timestamp', range)
}

export async function pruneMovementOlderThan(cutoffTimestamp: number): Promise<number> {
  const db = await getDb()
  const range = IDBKeyRange.upperBound(cutoffTimestamp, true)
  const keys = await db.getAllKeysFromIndex(MOVEMENT_STORE, 'timestamp', range)
  const tx = db.transaction(MOVEMENT_STORE, 'readwrite')
  await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done])
  return keys.length
}
