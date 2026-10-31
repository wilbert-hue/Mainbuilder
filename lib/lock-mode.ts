'use client'

import { useDashboardStore } from '@/lib/store'

/**
 * Whether the dashboard withholds generated content.
 *
 * Locks are a client-facing device: a preview shows the shape of the research
 * and sells the rest. While working on what is generated, they are in the way —
 * you cannot read what you are trying to fix. So they are off in a development
 * server and on in a production build, which is what Vercel runs.
 *
 * Nothing about the deployed site changes when this file ships.
 */
export const LOCKS_ENABLED = process.env.NODE_ENV === 'production'

/**
 * Whether this particular dashboard withholds anything.
 *
 * A handful of dashboards exist to be read rather than sold from: the review
 * links used to check what the generators write. Those carry `previewUnlocked`
 * on their saved record, and nothing else does — there is no toggle for it in
 * the builder, so a dashboard only becomes unlocked if someone sets the field
 * on it deliberately.
 *
 * Use this in place of LOCKS_ENABLED anywhere a lock hides generated copy.
 */
export function useLocksEnabled(): boolean {
  const previewUnlocked = useDashboardStore((state) => state.previewUnlocked)
  return LOCKS_ENABLED && !previewUnlocked
}
