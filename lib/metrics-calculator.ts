/**
 * Standard CAGR and market-share calculations for uploaded market data.
 * CAGR: compound growth from 2026 → 2033.
 * Share: mean(segment, 2026–2033) / mean(geography total, 2026–2033) per geography (not pooled across geographies).
 */

import type { DataRecord } from './types'

/** Fixed window for CAGR and mean share % across all uploads */
export const METRICS_START_YEAR = 2026
export const METRICS_END_YEAR = 2033

export function getYearsInMetricsRange(
  timeSeries: Record<number, number>,
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): number[] {
  return Object.keys(timeSeries)
    .map(Number)
    .filter((y) => !Number.isNaN(y) && y >= startYear && y <= endYear)
    .sort((a, b) => a - b)
}

/** Arithmetic mean of values across years in range (includes years present in series only) */
export function meanInYearRange(
  timeSeries: Record<number, number>,
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): number {
  const years = getYearsInMetricsRange(timeSeries, startYear, endYear)
  if (years.length === 0) return 0
  const sum = years.reduce((acc, y) => acc + (timeSeries[y] ?? 0), 0)
  return sum / years.length
}

/**
 * CAGR from startYear to endYear using endpoint values.
 * Formula: (end/start)^(1/years) - 1
 */
export function calculateCAGRFromTimeSeries(
  timeSeries: Record<number, number>,
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): number {
  const startValue = timeSeries[startYear]
  const endValue = timeSeries[endYear]
  if (
    startValue === undefined ||
    endValue === undefined ||
    startValue === null ||
    endValue === null ||
    startValue <= 0 ||
    endYear <= startYear
  ) {
    return 0
  }
  const numYears = endYear - startYear
  const cagr = (Math.pow(endValue / startValue, 1 / numYears) - 1) * 100
  return Math.round(cagr * 100) / 100
}

/** Leaf rows used to build per-geography yearly totals (avoids double-counting parents) */
export function isLeafForShareDenominator(record: DataRecord): boolean {
  if (record.segment === '__ALL_SEGMENTS__') return false
  if (record.is_aggregated === true) return false
  return true
}

function geographyGroupKey(record: DataRecord): string {
  return `${record.geography}|||${record.segment_type}`
}

/**
 * Per-geography yearly total for share denominator (sum of leaf segments in that geography + segment type).
 */
function yearlyGeographyTotal(
  pool: DataRecord[],
  geography: string,
  segmentType: string,
  year: number
): number {
  return pool
    .filter(
      (r) =>
        r.geography === geography &&
        r.segment_type === segmentType &&
        isLeafForShareDenominator(r)
    )
    .reduce((sum, r) => sum + (r.time_series[year] ?? 0), 0)
}

function geographyTotalMean(
  pool: DataRecord[],
  geography: string,
  segmentType: string,
  startYear: number,
  endYear: number
): number {
  const years: number[] = []
  for (let y = startYear; y <= endYear; y++) years.push(y)

  const yearlyTotals = years.map((y) => yearlyGeographyTotal(pool, geography, segmentType, y))
  if (yearlyTotals.every((t) => t === 0)) return 0
  return yearlyTotals.reduce((a, b) => a + b, 0) / years.length
}

/**
 * Mean share % (2026–2033): segment mean / that geography's total mean (not sum across selected countries).
 */
export function calculateMeanMarketShare(
  record: DataRecord,
  denominatorPool: DataRecord[],
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): number {
  const segmentMean = meanInYearRange(record.time_series, startYear, endYear)
  const geoTotalMean = geographyTotalMean(
    denominatorPool,
    record.geography,
    record.segment_type,
    startYear,
    endYear
  )
  if (geoTotalMean <= 0) return 0
  return Math.round((segmentMean / geoTotalMean) * 10000) / 100
}

/** Records that define geography totals (geography + segment type filters only) */
export function getShareDenominatorPool(
  allRecords: DataRecord[],
  options: {
    geographies?: string[]
    segmentType?: string
  }
): DataRecord[] {
  return allRecords.filter((r) => {
    if (options.segmentType && r.segment_type !== options.segmentType) return false
    if (
      options.geographies &&
      options.geographies.length > 0 &&
      !options.geographies.includes(r.geography)
    ) {
      return false
    }
    return isLeafForShareDenominator(r)
  })
}

export function applyMetricsToRecord(
  record: DataRecord,
  denominatorPool: DataRecord[],
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): { cagr: number; market_share: number } {
  const cagr = calculateCAGRFromTimeSeries(record.time_series, startYear, endYear)
  const market_share = calculateMeanMarketShare(record, denominatorPool, startYear, endYear)
  return { cagr, market_share }
}

/** Mutate all records: CAGR 2026–2033 and per-geography mean share */
export function applyMetricsToRecords(
  records: DataRecord[],
  startYear: number = METRICS_START_YEAR,
  endYear: number = METRICS_END_YEAR
): void {
  const denominatorPool = records.filter(isLeafForShareDenominator)

  for (const record of records) {
    record.cagr = calculateCAGRFromTimeSeries(record.time_series, startYear, endYear)
    record.market_share = calculateMeanMarketShare(record, denominatorPool, startYear, endYear)
  }
}
