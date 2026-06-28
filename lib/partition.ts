/**
 * Partition assignment — MASTER responsibility.
 *
 * When the master creates a new dashboard it calls assignPartition()
 * which picks the least-loaded partition (fewest documents in MongoDB).
 * This guarantees even distribution as described in master-slave
 * load balancing best practices.
 *
 * The chosen partitionKey is stored on the MongoDB document and never
 * changes for the lifetime of that dashboard. Slaves use it to route
 * reads to the correct cache bucket (see lib/slave-cache.ts).
 */

import { getMongoClient } from './mongodb'
import { getMongoDatabaseName, getMongoCollectionName } from './mongo-config'
import { PARTITION_COUNT } from './slave-cache'

function getBuilderCollection(client: Awaited<ReturnType<typeof getMongoClient>>) {
  return client.db(getMongoDatabaseName()).collection(getMongoCollectionName())
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface PartitionLoad {
  partitionId: number
  documentCount: number
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Query MongoDB to count how many documents live in each partition,
 * then return the partition with the fewest dashboards.
 *
 * Falls back to a random partition if the query fails so a MongoDB
 * hiccup never blocks a dashboard save.
 */
export async function assignPartition(): Promise<number> {
  try {
    const client = await getMongoClient()
    const col = getBuilderCollection(client)

    // Aggregate count per partitionKey in a single round-trip
    const counts: { _id: number; count: number }[] = await col
      .aggregate([
        { $group: { _id: '$partitionKey', count: { $sum: 1 } } },
      ])
      .toArray() as any

    // Build a full map including partitions with 0 documents
    const loadMap = new Map<number, number>()
    for (let i = 0; i < PARTITION_COUNT; i++) loadMap.set(i, 0)
    for (const { _id, count } of counts) {
      if (_id !== null && _id !== undefined) loadMap.set(_id, count)
    }

    // Pick the partition with the minimum load
    let minLoad = Infinity
    let chosen = 0
    for (const [partId, load] of loadMap.entries()) {
      if (load < minLoad) {
        minLoad = load
        chosen = partId
      }
    }

    return chosen
  } catch (err) {
    console.error('[partition] assignPartition failed, using random fallback:', err)
    return Math.floor(Math.random() * PARTITION_COUNT)
  }
}

/**
 * Return the current load of every partition (used by the health endpoint).
 */
export async function getPartitionLoads(): Promise<PartitionLoad[]> {
  try {
    const client = await getMongoClient()
    const col = getBuilderCollection(client)

    const counts: { _id: number; count: number }[] = await col
      .aggregate([
        { $group: { _id: '$partitionKey', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
      .toArray() as any

    const loadMap = new Map<number, number>()
    for (let i = 0; i < PARTITION_COUNT; i++) loadMap.set(i, 0)
    for (const { _id, count } of counts) {
      if (_id !== null && _id !== undefined) loadMap.set(_id, count)
    }

    return Array.from(loadMap.entries()).map(([partitionId, documentCount]) => ({
      partitionId,
      documentCount,
    }))
  } catch {
    return Array.from({ length: PARTITION_COUNT }, (_, i) => ({
      partitionId: i,
      documentCount: 0,
    }))
  }
}
