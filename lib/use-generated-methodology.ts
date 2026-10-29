'use client'

/**
 * Swap a demo market's methodology for a generated one when there is one.
 *
 * The deterministic block renders immediately, so the panel is never empty and
 * never waits on the network. If the route returns a generated block — from its
 * cache, or freshly written — it replaces it on arrival. Everything else (no
 * key configured, request failed, model output unusable) leaves the fallback in
 * place, which is what the dashboard showed before this existed.
 */

import { useEffect, useState } from 'react'
import type { MethodologySection } from '@/lib/intelligence-sheet-types'

export function useGeneratedMethodology(
  market: string | null | undefined,
  intelligenceSource: 'customer' | 'distributor',
  /** Skip the request entirely — e.g. the panel is not shown at all. */
  enabled = true
): MethodologySection[] | null {
  const [sections, setSections] = useState<MethodologySection[] | null>(null)
  const name = (market ?? '').trim()

  useEffect(() => {
    if (!enabled || !name) {
      setSections(null)
      return
    }

    // A market change must not leave the previous market's block on screen.
    setSections(null)

    const controller = new AbortController()
    fetch('/api/generate-methodology', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market: name, intelligenceSource }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (body?.generated && Array.isArray(body.sections) && body.sections.length) {
          setSections(body.sections as MethodologySection[])
        }
      })
      .catch(() => {
        // Aborted or offline — the fallback is already rendered.
      })

    return () => controller.abort()
  }, [name, intelligenceSource, enabled])

  return sections
}
