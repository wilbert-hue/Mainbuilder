/**
 * Master Registry — the master node's view of all slave partitions.
 *
 * Combines:
 *  • MongoDB partition loads  (from partition.ts — persistent state)
 *  • In-memory cache metrics  (from slave-cache.ts — runtime state)
 *
 * Exposes a single getSystemHealth() function consumed by the
 * /api/dashboards/health endpoint.
 */

import { getPartitionLoads } from './partition'
import { getCacheMetrics, getTotalCacheSize, PARTITION_COUNT } from './slave-cache'

// ── Types ─────────────────────────────────────────────────────────────────

export interface PartitionHealth {
  partitionId: number
  documentCount: number   // dashboards stored in this partition (MongoDB)
  cacheSize: number       // dashboards currently in memory cache
  cacheHits: number
  cacheMisses: number
  hitRate: string
  oldestCacheEntryAgeMs: number | null
}

export interface SystemHealth {
  status: 'healthy' | 'degraded'
  totalDashboards: number
  totalCached: number
  partitions: PartitionHealth[]
  mostLoadedPartition: number
  leastLoadedPartition: number
  overallHitRate: string
  checkedAt: string
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Collect a full system health snapshot.
 * Called by GET /api/dashboards/health.
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  const [partitionLoads, cacheMetrics] = await Promise.all([
    getPartitionLoads(),
    Promise.resolve(getCacheMetrics()),
  ])

  const partitions: PartitionHealth[] = Array.from(
    { length: PARTITION_COUNT },
    (_, i) => {
      const load = partitionLoads.find(p => p.partitionId === i)
      const cache = cacheMetrics.find(c => c.partitionId === i)
      return {
        partitionId: i,
        documentCount: load?.documentCount ?? 0,
        cacheSize: cache?.cacheSize ?? 0,
        cacheHits: cache?.hits ?? 0,
        cacheMisses: cache?.misses ?? 0,
        hitRate: cache?.hitRate ?? '0%',
        oldestCacheEntryAgeMs: cache?.oldestEntryAgeMs ?? null,
      }
    }
  )

  const totalDashboards = partitions.reduce((s, p) => s + p.documentCount, 0)
  const totalCached = getTotalCacheSize()

  // Most / least loaded by document count
  let mostLoaded = 0
  let leastLoaded = 0
  let maxDocs = -1
  let minDocs = Infinity
  for (const p of partitions) {
    if (p.documentCount > maxDocs) { maxDocs = p.documentCount; mostLoaded = p.partitionId }
    if (p.documentCount < minDocs) { minDocs = p.documentCount; leastLoaded = p.partitionId }
  }

  // Overall hit rate across all partitions
  const totalHits = partitions.reduce((s, p) => s + p.cacheHits, 0)
  const totalRequests = partitions.reduce((s, p) => s + p.cacheHits + p.cacheMisses, 0)
  const overallHitRate = totalRequests === 0
    ? '0%'
    : `${((totalHits / totalRequests) * 100).toFixed(1)}%`

  // System is "degraded" if any partition has 3x the load of another
  const imbalanceRatio = maxDocs === 0 ? 1 : maxDocs / Math.max(minDocs, 1)
  const status: SystemHealth['status'] = imbalanceRatio > 3 ? 'degraded' : 'healthy'

  return {
    status,
    totalDashboards,
    totalCached,
    partitions,
    mostLoadedPartition: mostLoaded,
    leastLoadedPartition: leastLoaded,
    overallHitRate,
    checkedAt: new Date().toISOString(),
  }
}
