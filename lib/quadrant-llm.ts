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

import { askForJson, cleanLine, cleanProse, COMMON_RULES } from '@/lib/llm-client'
import type { QuadrantParts, ScoringParameterPart } from '@/lib/demo-generation-types'

/** Fixed so every dashboard's quadrant reads alike. */
export const X_AXIS_NAME = 'Product Capability'
export const Y_AXIS_NAME = 'Business Capability'

/** Openers that signal the model fell back to describing rather than measuring. */
const FILLER_OPENER = /^(measures|assesses|evaluates|reviews|tracks|examines|analyzes|analyses|determines)\b/i

const SYSTEM_PROMPT = `You define the scoring parameters for a vendor positioning quadrant in a market research report.

Return ONLY JSON:
{"xParameters":[{"name":string,"definition":string}],
 "yParameters":[{"name":string,"definition":string}]}

Exactly 5 xParameters and exactly 5 yParameters.

The X axis is "${X_AXIS_NAME}" and scores what the vendor MAKES: the specific technical and
quality dimensions on which products in THIS market are actually judged by the people who buy them.
The Y axis is "${Y_AXIS_NAME}" and scores the vendor as a COMMERCIAL OPERATION in THIS market:
its installed base, its revenue in this category, where it sells, how it reaches customers, its
financial strength.

Write each parameter the way a sector analyst who knows this trade would:

GOOD (an electrosurgical devices market):
  "Generator Power and Precision" - "Maximum power output, cutting and coagulation quality, and
   precision control of monopolar and bipolar generators. Evidence includes published wattage,
   impedance monitoring, and clinical performance data."
  "Installed Base and Hospital Contracts" - "Number of generators and systems installed in hospitals
   and surgical centers, plus named contracts with providers or group purchasing organizations.
   Evidence includes installed base figures, contract announcements, and tender wins."

BAD (rejected - this is generic template language that would fit any market):
  "Product Capability Depth" - "Measures the range and sophistication of solutions offered."
  "Regulatory Compliance Rigor" - "Reviews adherence to applicable requirements."

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
function cleanParameters(value: unknown): ScoringParameterPart[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  const out: ScoringParameterPart[] = []

  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const rec = raw as Record<string, unknown>
    const name = cleanLine(rec.name)
    const definition = cleanProse(rec.definition)

    const words = name.split(' ').length
    if (words < 2 || words > 8) continue
    if (name.length < 6 || name.length > 70) continue
    if (definition.length < 40 || definition.length > 400) continue
    if (FILLER_OPENER.test(definition)) continue

    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name, definition })
  }

  return out.length >= 5 ? out.slice(0, 5) : null
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

  const xParameters = cleanParameters(parsed.xParameters)
  const yParameters = cleanParameters(parsed.yParameters)

  // Half a generated quadrant and half a template one would show two voices in
  // the same panel, so both axes or neither.
  if (!xParameters || !yParameters) return null

  return { xAxisName: X_AXIS_NAME, yAxisName: Y_AXIS_NAME, xParameters, yParameters }
}
