'use client'

/**
 * Swap a demo market's methodology for a generated one when there is one.
 *
 * The deterministic block renders immediately, so the panel is never empty and
 * never waits on the network. If the route returns a generated block — from its
 * cache, or freshly written — it replaces it on arrival. Everything else (no
 * key configured, request failed, model output unusable) leaves the fallback in
 * place, which is what the dashboard showed before this existed.
 *
 * A thin wrapper over `useDemoGeneration` so the customer intelligence table
 * shares the one request the rest of the dashboard already makes, rather than
 * asking for the same market down a second route.
 */

import type { MethodologySection } from '@/lib/intelligence-sheet-types'
import { useDemoGeneration } from '@/lib/use-demo-generation'

export function useGeneratedMethodology(
  market: string | null | undefined,
  intelligenceSource: 'customer' | 'distributor',
  /** Skip the request entirely — e.g. the panel is not shown at all. */
  enabled = true
): MethodologySection[] | null {
  const content = useDemoGeneration(market, intelligenceSource, enabled)
  const sections = content?.methodology
  return sections?.length ? sections : null
}
