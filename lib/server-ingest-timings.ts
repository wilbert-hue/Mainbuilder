/**
 * Server-side stage timing for ingest / generation routes (for benchmarks & resume-worthy numbers).
 * Enable response headers/body embedding with DASHBOARD_PROCESSING_METRICS=1 or in development.
 */

export function ingestTimingsExposed(): boolean {
  return (
    process.env.DASHBOARD_PROCESSING_METRICS === '1' ||
    process.env.NODE_ENV === 'development'
  )
}

/**
 * Lap timer: each lap() captures ms since previous lap (or start). done() adds total elapsed.
 */
export function createStageTimer() {
  const t0 = performance.now()
  let cursor = t0
  const stages: Record<string, number> = {}

  function lap(label: string) {
    const n = performance.now()
    const ms = Math.round(n - cursor)
    stages[label] = ms
    cursor = n
    return ms
  }

  function done<T extends Record<string, number | undefined> = Record<string, never>>(
    extra?: T
  ): { stages: Record<string, number>; totalMs: number } & T {
    return {
      stages: { ...stages },
      totalMs: Math.round(performance.now() - t0),
      ...(extra ?? ({} as T)),
    }
  }

  return { lap, done }
}

/** RFC 6797 Server-Timing header for browser DevTools (Network pane). */
export function toServerTimingHeader(stages: Record<string, number>, totalMs: number): string {
  const parts = Object.entries(stages).map(([name, dur]) => {
    const safe = name.replace(/[^a-zA-Z0-9_-]/g, '_')
    return `${safe};dur=${dur}`
  })
  parts.push(`total;dur=${totalMs}`)
  return parts.join(', ')
}

export function logIngestTimings(route: string, payload: Record<string, unknown>) {
  console.log(`[${route}] ingest timings`, JSON.stringify(payload))
}
