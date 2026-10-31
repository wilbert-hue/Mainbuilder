/**
 * Write a market's methodology lists with an LLM instead of a lookup table.
 *
 * `industry-profiles.ts` carries hand-written lists for the industries we named,
 * and composes a generic one for everything else. That covers the markets we
 * thought of; the long tail gets the generic copy. This asks a model for the
 * three lists instead, keyed to the market, and the table stays as the fallback
 * for when the key is missing, the call fails, or the answer comes back unusable.
 *
 * Server only — the key must never reach the browser.
 */

import { askForJson, cleanNameList, COMMON_RULES } from '@/lib/llm-client'
import type { MethodologyParts } from '@/lib/methodology-parts'

const SYSTEM_PROMPT = `You write the research methodology panel shown above a B2B customer directory in a market research report.

Return ONLY JSON: {"organisations":[string],"designations":[string],"triggerSignals":[string]}

organisations - 5 kinds of organisation that BUY in this market.
  They must be the people who PAY FOR AND USE it. Never a vendor, a supplier, or anyone who only
  finances or insures the purchase.
  Qualify each by size, ownership or operating model - never a bare one word category.
  "Multi Site Private Hospital Groups" is right; "Hospitals" is too thin to print.
designations - 5 job titles that decide or sign off this purchase, from senior to working level.
  Example style: "Chief Medical Officer", "Head of Procurement", "Clinical Supply Manager".
triggerSignals - 5 observable events that say an organisation is about to buy in this market.
  Each MUST start with a gerund describing something an outside observer could see happen.
  Example style: "Opening a new outpatient facility or expanding treatment capacity",
  "Hiring specialists to staff a new service line", "Commissioning a replacement production line".

Rules:
- Sentence case: a capital first letter only, except for real proper nouns.
- Never use a hyphen or a bracket, and never invent a number of sites, staff or stores.
- No trailing punctuation.
${COMMON_RULES}`

/**
 * Ask the model for a market's lists. Returns null on any failure — a missing
 * key, a network error, a refusal, or an answer that does not survive cleaning —
 * so every caller falls back to the deterministic profile.
 */
export async function generateMethodologyParts(
  market: string,
  signal?: AbortSignal
): Promise<MethodologyParts | null> {
  const name = market.trim()
  if (name.length < 3) return null

  const parsed = await askForJson('methodology', SYSTEM_PROMPT, `Market: ${name}`, 3000, signal)
  if (!parsed) return null

  const organisations = cleanNameList(parsed.organisations, 3)
  const designations = cleanNameList(parsed.designations, 3)
  const triggerSignals = cleanNameList(parsed.triggerSignals, 3)

  // Partial answers are not worth showing: a panel with one real list and two
  // fallback ones reads as inconsistent. All three or none.
  if (!organisations || !designations || !triggerSignals) return null

  return { organisations, designations, triggerSignals }
}
