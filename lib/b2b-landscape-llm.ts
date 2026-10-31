/**
 * The B2B tab's header: who buys, who answered, and what the four tabs are called.
 *
 * Today this panel and the customer intelligence methodology both call
 * `buildLandscape()` and read the same two arrays off it, so the dashboard shows
 * the identical organisation and designation lists twice. They are different
 * questions — the methodology describes the directory's coverage, this
 * describes who sat for the survey — so the model is given the methodology's
 * answer and told to produce a different one.
 *
 * Server only.
 */

import { askForJson, cleanLine, cleanProse, cleanNameList, COMMON_RULES } from '@/lib/llm-client'
import type { B2bLandscapeParts } from '@/lib/demo-generation-types'

const SYSTEM_PROMPT = `You write the header of a B2B buyer survey report: who buys in this market, who answered the survey, and what the four question sections are called.

Return ONLY JSON:
{"buyersIntro":string,"buyerTypes":[{"name":string,"description":string}],
 "organisations":[string],"designations":[string],"sectionTitles":[string]}

buyersIntro - ONE sentence naming the kinds of people who decide this purchase and what they are
  responsible for. Example style: "Clinical procurement managers, surgical department heads, and
  supply chain executives responsible for operating room infrastructure."
buyerTypes - exactly 4 kinds of organisation that buy here, named plainly and broadly, each with
  ONE sentence on how that kind of buyer buys in this market.
  Example style: name "Hospitals and Health Systems", description "Buy through central procurement
  on multi year contracts, with clinical sign off on every new platform."
organisations - 6 organisations that answered the survey, each qualified by size, ownership or model
  so no two read alike. Example style: "Large Multi Specialty Private Hospital Groups",
  "Mid Sized Community Non Profit Hospitals", "Private Physician Owned Surgical Practices".
designations - 5 job titles of the people who answered, at working and middle level - the people who
  actually handle this purchase, not the board. Example style: "Surgical Supply Chain Coordinator",
  "Biomedical Equipment Specialist", "Operating Room Inventory Manager".
sectionTitles - exactly 4 tab titles naming this market's own subject, in this order:
  buying, adoption and usage, performance, future buying and investment.
  Example style for a surgical devices market: ["Surgical Device Buying",
  "Surgical Device Adoption and Usage", "Surgical Device Performance",
  "Future Surgical Device Buying and Investment"].

Rules:
- Every entry must be a real, specific kind of organisation or a real job title in this trade.
- buyerTypes are broad categories; organisations are narrower and qualified. They must not repeat each other.
- Qualify an organisation by its size band, ownership or operating model, NEVER by inventing a number.
  "Mid Sized Regional Convenience Chains" is right; "Regional Chain with 150 Outlets" is wrong.
- Never use a hyphen or a bracket in a list entry. Write "Multi Specialty", not "Multi-Specialty".
- Title Case for list entries. No trailing punctuation except on buyersIntro.
${COMMON_RULES}`

/** Keep the buyer cards that carry both a name and a usable sentence. */
function cleanBuyerTypes(value: unknown): { name: string; description: string }[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  const out: { name: string; description: string }[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const name = cleanLine(rec.name)
    const description = cleanProse(rec.description)
    if (name.length < 4 || name.length > 60) continue
    if (description.length < 20 || description.length > 300) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, description })
  }
  return out.length === 4 ? out : null
}

/** Loose comparison, so "Procurement Manager" and "procurement managers" collide. */
function overlapKey(value: string): string {
  return value.toLowerCase().replace(/\b(s|es)\b/g, '').replace(/[^a-z0-9]/g, '')
}

/** How many of `candidate` already appear in `existing`. */
function overlapCount(candidate: string[], existing: string[]): number {
  const seen = new Set(existing.map(overlapKey))
  return candidate.filter((line) => seen.has(overlapKey(line))).length
}

/**
 * Write the B2B header for a market.
 *
 * `avoid` carries the customer intelligence methodology's lists; anything that
 * comes back too close to them is rejected, because showing the same list under
 * two different headings is the defect this exists to fix.
 */
export async function generateB2bLandscape(
  market: string,
  avoid: { organisations: string[]; designations: string[] } | null,
  signal?: AbortSignal
): Promise<B2bLandscapeParts | null> {
  const name = market.trim()
  if (name.length < 3) return null

  const avoidBlock =
    avoid && (avoid.organisations.length || avoid.designations.length)
      ? `\n\nAnother panel on this dashboard already shows the lists below. Yours must be different - different wording and a different cut of the market, not the same entries reordered.\nAlready shown as organisations: ${avoid.organisations.join('; ')}\nAlready shown as designations: ${avoid.designations.join('; ')}`
      : ''

  const parsed = await askForJson(
    'b2b-landscape',
    SYSTEM_PROMPT,
    `Market: ${name}${avoidBlock}`,
    2500,
    signal
  )
  if (!parsed) return null

  const buyersIntro = cleanProse(parsed.buyersIntro)
  const buyerTypes = cleanBuyerTypes(parsed.buyerTypes)
  const organisations = cleanNameList(parsed.organisations, 5, 6)
  const designations = cleanNameList(parsed.designations, 4, 5)
  const sectionTitles = cleanNameList(parsed.sectionTitles, 4, 4)

  if (!buyersIntro || buyersIntro.length < 30 || buyersIntro.length > 300) return null
  if (!buyerTypes || !organisations || !designations || !sectionTitles) return null

  // A tab title that is only a couple of characters leaves a bare-looking tab.
  if (sectionTitles.some((title) => title.length < 6 || title.length > 60)) return null

  // Broad buyer types and qualified survey organisations should not be the same
  // list under two headings either.
  if (overlapCount(organisations, buyerTypes.map((b) => b.name)) > 1) return null

  if (avoid) {
    if (overlapCount(organisations, avoid.organisations) > 1) return null
    if (overlapCount(designations, avoid.designations) > 1) return null
  }

  return { buyersIntro, buyerTypes, organisations, designations, sectionTitles }
}
