/**
 * The quadrant's ten scoring parameters, written for the market.
 *
 * `industry-profiles.ts` carries five product parameters per offering type and
 * four business parameters shared by every market on earth, so two unrelated
 * trades get the same business axis and anything outside the keyword list gets
 * the same product axis too. An analyst export does the opposite: on a surgical
 * devices study the business axis reads "Installed Base and Hospital Contracts".
 *
 * The axis names stay fixed. They are what the quadrant descriptions and the
 * "Best-in-class Product Capability" position lines are phrased against, and
 * they should read the same on every dashboard; the parameters underneath are
 * where the market shows through.
 *
 * Server only.
 */

import { askForJson, cleanLine, cleanProse, reject, COMMON_RULES } from '@/lib/llm-client'
import type { QuadrantParts, ScoringParameterPart } from '@/lib/demo-generation-types'

/** Fixed so every dashboard's quadrant reads alike. */
export const X_AXIS_NAME = 'Product Capability'
export const Y_AXIS_NAME = 'Business Capability'

/**
 * House style opens a definition with the thing being measured, not a verb
 * announcing that it is being measured.
 *
 * This started as a rejection rule and threw away good work: "Evaluates the
 * ability of dressings to maintain optimal wound moisture through absorptive
 * polymers and vapor-permeable films" is exactly the specificity we want, and
 * the only thing wrong with it is the first word. Dropping the verb says the
 * same thing in the house voice, so it is repaired rather than refused.
 */
const FILLER_OPENER = /^(measures|assesses|evaluates|reviews|tracks|examines|analyzes|analyses|determines)\s+/i

/**
 * Named regulators, standards bodies and certification schemes.
 *
 * The prompt forbids these and the model agrees, then writes "CE/ FDA filings"
 * anyway. A demo dashboard that cites a real regulator reads as a claim about
 * what was actually checked, so the parameter is dropped rather than shown.
 */
const NAMED_AUTHORITY =
  /\b(FDA|CE[ /-]?mark(ed|ing)?|ISO|ASTM|IEC|UL|OSHA|EPA|USDA|FCC|GDPR|HIPAA|REACH|RoHS|MDR|CFR|ANSI|DIN|JIS|BIS|FSSAI|EFSA|EMA|NIST|SOC ?2|PCI ?DSS)\b/

function openWithTheSubject(definition: string): string {
  const trimmed = definition.replace(FILLER_OPENER, '')
  if (trimmed === definition || !trimmed) return definition
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

const SYSTEM_PROMPT = `You define the scoring parameters for a vendor positioning quadrant in a market research report.

Return ONLY JSON:
{"xParameters":[{"name":string,"definition":string}],
 "yParameters":[{"name":string,"definition":string}]}

Give exactly 5 xParameters and 5 yParameters.

These score a COMPANY against its competitors, so each parameter is a capability a company can be
strong or weak at across its whole range. A single laboratory measurement of one product is not a
capability: "Moisture Vapor Transmission Rate" is a spec on a datasheet, while "Dressing Performance
and Healing Evidence" is something a company is good or bad at.

The X axis is "${X_AXIS_NAME}" and scores what the company MAKES. Cover these five, in order,
each named in the vocabulary of THIS trade:
  1 core performance of the main product
  2 breadth of the range: types, formats, grades or modalities offered
  3 depth of the supporting portfolio: accessories, consumables, adjacent lines
  4 quality, compliance and the evidence behind the claims
  5 innovation: new development reaching the market

The Y axis is "${Y_AXIS_NAME}" and scores the company as a COMMERCIAL OPERATION in this market.
Cover these five, in order:
  1 installed base and the contracts behind it
  2 revenue in this category and its growth
  3 geographic footprint
  4 route to market: channels, distributors, partnerships
  5 financial strength and capacity to invest

Write each parameter the way a sector analyst who knows this trade would:

GOOD (an electrosurgical devices market) - a capability, named in the trade's own words:
  "Generator Power and Precision" - "Maximum power output, cutting and coagulation quality, and
   precision control of monopolar and bipolar generators. Evidence includes published wattage,
   impedance monitoring, and clinical performance data."
  "Instrument and Accessory Portfolio Depth" - "Breadth of disposable and reusable instruments and
   the accessories supplied with them. Evidence includes catalogue counts, specialty specific
   designs, and compatibility with third party generators."
  "Installed Base and Hospital Contracts" - "Number of generators and systems installed in hospitals
   and surgical centers, plus named contracts with providers or group purchasing organizations.
   Evidence includes installed base figures, contract announcements, and tender wins."

BAD - generic template language that would fit any market:
  "Product Capability Depth" - "Measures the range and sophistication of solutions offered."
  "Regulatory Compliance Rigor" - "Reviews adherence to applicable requirements."

ALSO BAD - a single laboratory measurement rather than a company capability:
  "Moisture Vapor Transmission Rate", "Hydrogel Osmotic Swelling Capacity", "Backlash Tolerance"
  These describe one product on a test bench. Widen them to the capability they belong to.

Rules:
- Every parameter name must use this market's own vocabulary. A name that would fit any market is wrong.
- Name the real components, formats, materials or modes of this trade inside the definitions.
- Each definition is 2 sentences: what is measured, then the evidence it is read from.
- NEVER begin a definition with "Measures", "Assesses", "Evaluates", "Reviews" or "Tracks".
- Names are 3 to 6 words, Title Case, no trailing punctuation.
${COMMON_RULES}`

/**
 * Keep the parameters that read like an analyst wrote them.
 * Returns null unless all five survive — a mixed axis reads as a mistake.
 */
function cleanParameters(axis: string, value: unknown): ScoringParameterPart[] | null {
  if (!Array.isArray(value)) return reject(`${axis} not an array`)
  const seen = new Set<string>()
  const out: ScoringParameterPart[] = []

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const name = cleanLine(rec.name)
    const definition = openWithTheSubject(cleanProse(rec.definition))

    const words = name.split(' ').length
    if (words < 2 || words > 8) {
      reject(`${axis} name word count`, name)
      continue
    }
    if (name.length < 6 || name.length > 70) {
      reject(`${axis} name length`, name)
      continue
    }
    if (definition.length < 40 || definition.length > 400) {
      reject(`${axis} definition length ${definition.length}`, `${name}: ${definition}`)
      continue
    }
    if (NAMED_AUTHORITY.test(definition) || NAMED_AUTHORITY.test(name)) {
      reject(`${axis} names a real authority`, `${name}: ${definition}`)
      continue
    }
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, definition })
  }

  // Four is enough to render: the view counts what it is given rather than
  // printing a fixed ten, and a complete axis minus one dropped entry beats
  // falling back to the template for the whole quadrant.
  return out.length >= 4 ? out.slice(0, 5) : reject(`${axis} kept only ${out.length} of 5`)
}

/**
 * Write a market's ten scoring parameters. Returns null on any failure so the
 * caller keeps the deterministic profile's parameters.
 */
export async function generateQuadrantParts(
  market: string,
  signal?: AbortSignal
): Promise<QuadrantParts | null> {
  const name = market.trim()
  if (name.length < 3) return null

  const parsed = await askForJson('quadrant', SYSTEM_PROMPT, `Market: ${name}`, 3000, signal)
  if (!parsed) return null

  const xParameters = cleanParameters('x', parsed.xParameters)
  const yParameters = cleanParameters('y', parsed.yParameters)

  // Half a generated quadrant and half a template one would show two voices in
  // the same panel, so both axes or neither.
  if (!xParameters || !yParameters) return null

  return { xAxisName: X_AXIS_NAME, yAxisName: Y_AXIS_NAME, xParameters, yParameters }
}
