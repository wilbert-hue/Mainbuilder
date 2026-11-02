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

import { askForJson, cleanLine, cleanProse, cleanNameList, reject, SIZE_LED, stockStageTitles, COMMON_RULES } from '@/lib/llm-client'
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
organisations - 6 kinds of organisation that answered the survey. Name the kinds that actually
  exist in THIS trade and distinguish them by what they DO differently, not by how big they are.
  A reader should learn something about the market from the list.
  This shows the SHAPE only - never reuse its wording. For a commercial laundry market:
    "Hotel housekeeping operations", "Hospital linen services", "Workwear rental companies",
    "Care home laundry rooms", "Sports club kit rooms", "Prison service laundries".
  BAD, and the trap to avoid: starting entries with a size or scope word. "Large Urban Academic
    Hospital System", "Mid Sized Regional Non Profit Hospital", "Small Independent Clinics" -
    these say nothing about the trade and come out identical on every market.
  NEVER begin an entry with Large, Mid, Medium, Small, Major, Leading, Global, National or
  Regional, and use at most one such word across all six entries.
designations - 5 job titles of the people who answered, at working and middle level - the people who
  actually handle this purchase, not the board. Example style: "Surgical Supply Chain Coordinator",
  "Biomedical Equipment Specialist", "Operating Room Inventory Manager".
sectionTitles - exactly 4 tab titles. They always cover the same four stages, in this order:
  1 how buyers choose, qualify and contract a supplier
  2 how the thing is put to work once bought
  3 how it has held up in service and what it returned
  4 what the organisation will do next

  Each title names this market's short subject and says its stage in the words of THIS trade.
  Use the short subject, not the full market name: "Gearbox", not "Industrial Gearbox Market".

  NEVER use the words Buying, Purchase, Purchasing, Adoption, Usage, Performance or Investment.
  Those are the stock words, and using them makes every market's tabs read identically.
  Say the same thing in this trade's language instead.

  For a surgical devices market:
    ["Surgical Device Sourcing", "Surgical Device Use in Theatre",
     "Surgical Device Reliability in Service", "Future Surgical Device Plans"]
  For a bakery ingredients market:
    ["Ingredient Supplier Selection", "Ingredient Use in the Bakery",
     "Ingredient Quality in Production", "Forward Ingredient Planning"]

Rules:
- Every entry must be a real, specific kind of organisation or a real job title in this trade.
- buyerTypes are broad categories; organisations are narrower and qualified. They must not repeat each other.
- Never invent a number of sites, outlets, staff or stores.
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

/**
 * Size and scope words that say nothing about the trade.
 *
 * Asked to qualify an organisation, the model reaches for the same ladder every
 * time — Large, Mid Sized, Small, Regional, National — so eight unrelated
 * markets came back with the same six shapes and a different noun.
 */
const SIZE_WORD = SIZE_LED


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

  const stock = stockStageTitles(sectionTitles)
  if (stock.length) return reject('tab titles use the stock stage words', stock.join(' / '))

  // Two is tolerable — "Regional Burn Treatment Centers" still names the trade.
  // Three or more means the size ladder has come back.
  const sized = organisations.filter((line) => SIZE_WORD.test(line)).length
  if (sized > 2) return reject(`${sized} organisations qualified by size alone`, organisations.join(' | '))

  // Broad buyer types and qualified survey organisations should not be the same
  // list under two headings either.
  if (overlapCount(organisations, buyerTypes.map((b) => b.name)) > 1) return null

  if (avoid) {
    if (overlapCount(organisations, avoid.organisations) > 1) return null
    if (overlapCount(designations, avoid.designations) > 1) return null
  }

  return { buyersIntro, buyerTypes, organisations, designations, sectionTitles }
}
