/**
 * Slave Cache — 8 independent partitioned cache buckets.
 *
 * Each partition is a completely isolated Map. This means:
 *  • No lock contention between partitions (reads on partition 3 never
 *    block reads on partition 7).
 *  • Cache eviction in one partition never affects another.
 *  • Load is spread evenly: a hot dashboard in partition 2 doesn't
 *    slow down dashboards in other partitions.
 *
 * Partition assignment is determined by the MASTER at creation time
 * (see lib/partition.ts) and stored in the MongoDB document.
 *
 * TTL: entries expire after CACHE_TTL_MS (default 2 hours). Expired
 * entries are evicted lazily on read, and eagerly by a periodic sweep.
 */

import type { DashboardDocument } from './dashboard-mongo'

// ── Config ────────────────────────────────────────────────────────────────

export const PARTITION_COUNT = 8
const CACHE_TTL_MS = 2 * 60 * 60 * 1000   // 2 hours
const SWEEP_INTERVAL_MS = 10 * 60 * 1000   // sweep every 10 min

// ── Types ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: DashboardDocument
  cachedAt: number       // Date.now() when stored
  hitCount: number       // how many times this entry was served from cache
}

interface PartitionMetrics {
  partitionId: number
  cacheSize: number      // current number of entries
  hits: number           // total cache hits since start
  misses: number         // total cache misses since start
  hitRate: string        // "73.4%"
  oldestEntryAgeMs: number | null
  newestEntryAgeMs: number | null
}

// ── Partition state ───────────────────────────────────────────────────────

interface Partition {
  cache: Map<string, CacheEntry>
  hits: number
  misses: number
}

// Store partitions on `global` so the same Map instances are shared across
// all API route worker threads in Next.js dev mode (and across HMR reloads).
// In production this is a no-op since there is only one Node.js process.
declare global {
  // eslint-disable-next-line no-var
  var _slavePartitions: Partition[] | undefined
}

if (!global._slavePartitions) {
  global._slavePartitions = Array.from({ length: PARTITION_COUNT }, () => ({
    cache: new Map<string, CacheEntry>(),
    hits: 0,
    misses: 0,
  }))
}

const partitions: Partition[] = global._slavePartitions

// ── Helpers ───────────────────────────────────────────────────────────────

/** Which partition owns a given dashboardId (set by master at creation) */
export function getPartitionId(partitionKey: number): number {
  return Math.abs(partitionKey) % PARTITION_COUNT
}

function isExpired(entry: CacheEntry): boolean {
  return Date.now() - entry.cachedAt > CACHE_TTL_MS
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Read a dashboard from its partition cache.
 * Returns the document if found and not expired, otherwise null.
 */
export function cacheGet(
  dashboardId: string,
  partitionKey: number
): DashboardDocument | null {
  const p = partitions[getPartitionId(partitionKey)]
  const entry = p.cache.get(dashboardId)

  if (!entry) {
    p.misses++
    return null
  }

  if (isExpired(entry)) {
    p.cache.delete(dashboardId)
    p.misses++
    return null
  }

  entry.hitCount++
  p.hits++
  return entry.data
}

/**
 * Store a dashboard into its partition cache.
 * Overwrites any existing entry (used after a MongoDB fetch or on pre-warm).
 */
export function cacheSet(
  dashboardId: string,
  partitionKey: number,
  data: DashboardDocument
): void {
  const p = partitions[getPartitionId(partitionKey)]
  p.cache.set(dashboardId, {
    data,
    cachedAt: Date.now(),
    hitCount: 0,
  })
}

/**
 * Invalidate a specific dashboard entry (call after an update).
 */
export function cacheInvalidate(dashboardId: string, partitionKey: number): void {
  partitions[getPartitionId(partitionKey)].cache.delete(dashboardId)
}

/**
 * Return per-partition metrics for the health endpoint.
 */
export function getCacheMetrics(): PartitionMetrics[] {
  return partitions.map((p, id) => {
    const total = p.hits + p.misses
    const hitRate = total === 0 ? '0%' : `${((p.hits / total) * 100).toFixed(1)}%`

    let oldestAge: number | null = null
    let newestAge: number | null = null
    const now = Date.now()

    for (const entry of p.cache.values()) {
      const age = now - entry.cachedAt
      if (oldestAge === null || age > oldestAge) oldestAge = age
      if (newestAge === null || age < newestAge) newestAge = age
    }

    return {
      partitionId: id,
      cacheSize: p.cache.size,
      hits: p.hits,
      misses: p.misses,
      hitRate,
      oldestEntryAgeMs: oldestAge,
      newestEntryAgeMs: newestAge,
    }
  })
}

/**
 * Total dashboards currently held across all partition caches.
 */
export function getTotalCacheSize(): number {
  return partitions.reduce((sum, p) => sum + p.cache.size, 0)
}

// ── Periodic sweep ────────────────────────────────────────────────────────
// Eagerly evicts expired entries so memory doesn't grow unbounded.
// Runs on the server process only (not in the browser bundle).

if (typeof setInterval !== 'undefined' && typeof window === 'undefined') {
  setInterval(() => {
    let evicted = 0
    for (const p of partitions) {
      for (const [id, entry] of p.cache.entries()) {
        if (isExpired(entry)) {
          p.cache.delete(id)
          evicted++
        }
      }
    }
    if (evicted > 0) {
      console.log(`[slave-cache] Sweep evicted ${evicted} expired entries`)
    }
  }, SWEEP_INTERVAL_MS)
}
