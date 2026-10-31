/**
 * What is this market, actually?
 *
 * Run first, and its answer is handed to every other generator. Two of its
 * fields earn their keep on their own:
 *
 *   isBrand   a market named "Diet Coke" is one brand, so asking which brand of
 *             Diet Coke the respondent buys is nonsense. The deterministic
 *             questionnaire has no way to know that and asks it anyway.
 *   askUnit   what to ask about instead when isBrand is true.
 *
 * Server only.
 */

import { askForJson, cleanLine, cleanProse, COMMON_RULES } from '@/lib/llm-client'
import type { MarketProfileParts, ProviderCategoryPart } from '@/lib/demo-generation-types'

const OFFERINGS = ['Product', 'Equipment', 'Service', 'Material', 'Platform', 'Technology']

const SYSTEM_PROMPT = `You classify a market for a B2B market research platform. Read the market name and decide what it actually is.

Return ONLY JSON:
{"subject":string,"isBrand":boolean,"audience":"b2b"|"b2c"|"both",
 "offering":"Product"|"Equipment"|"Service"|"Material"|"Platform"|"Technology",
 "definition":string,"providerCategories":[{"name":string,"description":string}],
 "askUnit":string}

subject - the thing being bought, stripped of "Global", "Market", "Industry", "Report" and any country.
isBrand - TRUE if the subject names ONE specific commercial brand or product line rather than a category.
  "Diet Coke" is TRUE (it is one brand). "Carbonated Soft Drinks" is FALSE (a category containing brands).
  "iPhone" TRUE. "Smartphones" FALSE. "Advanced Wound Care" FALSE.
audience - who buys it. b2c if households buy it, b2b if organisations do, both if genuinely both.
offering - what kind of thing it is.
definition - 2 sentences saying what this market covers: what is made or sold, and the scope.
providerCategories - 1 to 3 kinds of company the quadrant would compare. Each with a one sentence
  description starting with the plural name and a colon.
askUnit - the noun a survey question should use when asking what someone bought.
  If isBrand is TRUE this MUST NOT be "brand" - use "pack size", "variant", "retailer" or similar.
  If isBrand is FALSE it is usually "brand".

Rules:
${COMMON_RULES}
- No trailing punctuation on subject or askUnit.`

/** Keep only categories that carry both a name and a usable description. */
function cleanCategories(value: unknown): ProviderCategoryPart[] {
  if (!Array.isArray(value)) return []
  const out: ProviderCategoryPart[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const name = cleanLine(rec.name)
    const description = cleanProse(rec.description)
    if (name.length < 3 || name.length > 60) continue
    if (description.length < 10 || description.length > 400) continue
    out.push({ name, description })
  }
  return out.slice(0, 3)
}

function cleanAudience(value: unknown): MarketProfileParts['audience'] | null {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return v === 'b2b' || v === 'b2c' || v === 'both' ? v : null
}

/**
 * Classify a market. Returns null on any failure, so callers fall back to the
 * keyword classifiers the deterministic generators already use.
 */
export async function generateMarketProfile(
  market: string,
  signal?: AbortSignal
): Promise<MarketProfileParts | null> {
  const name = market.trim()
  if (name.length < 3) return null

  const parsed = await askForJson('market-profile', SYSTEM_PROMPT, `Market: ${name}`, 1200, signal)
  if (!parsed) return null

  const subject = cleanLine(parsed.subject)
  const definition = cleanProse(parsed.definition)
  const askUnit = cleanLine(parsed.askUnit).toLowerCase()
  const audience = cleanAudience(parsed.audience)
  const offering = cleanLine(parsed.offering)
  const providerCategories = cleanCategories(parsed.providerCategories)

  if (!subject || !audience || !definition || !askUnit) return null
  if (definition.length < 40) return null
  if (!OFFERINGS.includes(offering)) return null
  if (!providerCategories.length) return null

  const isBrand = parsed.isBrand === true

  // The whole point of isBrand is to stop the brand question. If the model says
  // "brand" anyway, its own classification contradicts its answer and we cannot
  // trust either — fall back rather than ask the nonsense question.
  if (isBrand && /\bbrands?\b/.test(askUnit)) return null

  return { subject, isBrand, audience, offering, definition, providerCategories, askUnit }
}
