'use client'

/**
 * Fetch a demo market's generated content, once per market per page.
 *
 * Every tab renders its deterministic content immediately and swaps in the
 * generated version when it arrives, so nothing waits on the network and a
 * failure leaves the dashboard exactly as it was.
 *
 * The in-flight map matters for cost, not just for tidiness: the quadrant and
 * the buyer survey both mount on the same dashboard, and two uncached requests
 * racing each other would generate the same market twice and pay for it twice.
 */

import { useEffect, useState } from 'react'
import type { DemoGeneration } from '@/lib/demo-generation-types'

type Source = 'customer' | 'distributor'

/** Requests that have been started but not yet answered, keyed by market. */
const inFlight = new Map<string, Promise<DemoGeneration | null>>()

/** Answers already received, so a remount does not re-ask. */
const resolved = new Map<string, DemoGeneration | null>()

function requestKey(market: string, source: Source): string {
  return `${source}::${market.toLowerCase()}`
}

async function load(market: string, source: Source): Promise<DemoGeneration | null> {
  try {
    const res = await fetch('/api/generate-demo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market, intelligenceSource: source }),
    })
    if (!res.ok) return null
    const body = await res.json()
    return body?.generated && body.content ? (body.content as DemoGeneration) : null
  } catch {
    return null
  }
}

export function fetchDemoGeneration(
  market: string,
  source: Source
): Promise<DemoGeneration | null> {
  const key = requestKey(market, source)
  if (resolved.has(key)) return Promise.resolve(resolved.get(key) ?? null)

  const existing = inFlight.get(key)
  if (existing) return existing

  const promise = load(market, source).then((content) => {
    resolved.set(key, content)
    inFlight.delete(key)
    return content
  })
  inFlight.set(key, promise)
  return promise
}

/**
 * The generated content for a market, or null until it arrives.
 * `enabled` is false wherever the panel is not shown, so nothing is requested
 * for a dashboard built from a real workbook.
 */
export function useDemoGeneration(
  market: string | null | undefined,
  source: Source = 'customer',
  enabled = true
): DemoGeneration | null {
  const name = (market ?? '').trim()
  const [content, setContent] = useState<DemoGeneration | null>(() =>
    name && enabled ? resolved.get(requestKey(name, source)) ?? null : null
  )

  useEffect(() => {
    if (!enabled || !name) {
      setContent(null)
      return
    }

    // A market change must not leave the previous market's copy on screen.
    setContent(resolved.get(requestKey(name, source)) ?? null)

    let live = true
    fetchDemoGeneration(name, source).then((result) => {
      if (live && result) setContent(result)
    })
    return () => {
      live = false
    }
  }, [name, source, enabled])

  return content
}
