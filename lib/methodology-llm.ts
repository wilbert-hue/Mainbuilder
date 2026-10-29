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

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/** Chosen for quality on this account's model list; the others are much weaker. */
const MODEL = 'openai/gpt-oss-120b'

import type { MethodologyParts } from '@/lib/methodology-parts'

const SYSTEM_PROMPT = `You write the research methodology panel shown above a B2B customer directory in a market research report.

Return ONLY JSON: {"organisations":[string],"designations":[string],"triggerSignals":[string]}

organisations - 5 kinds of organisation that BUY in this market (buyers, never vendors or suppliers).
  Qualify each by size, ownership or model. Example style: "Hospital systems and integrated delivery networks", "Independent specialty clinics".
designations - 5 job titles that decide or sign off this purchase, from senior to working level.
  Example style: "Chief Medical Officer", "Head of Procurement", "Clinical Supply Manager".
triggerSignals - 5 observable events that say an organisation is about to buy in this market.
  Each MUST start with a gerund describing something an outside observer could see happen.
  Example style: "Opening a new outpatient facility or expanding treatment capacity",
  "Hiring specialists to staff a new service line", "Commissioning a replacement production line".

Rules:
- Specific to this market's trade, not generic business language.
- Sentence case: capital first letter only, except real proper nouns. No trailing punctuation.
- Describe generic observable events. Never name a real company, law, regulation, standard or certification scheme.
- Plain ASCII punctuation only.`

/**
 * Normalise one line: the model returns typographic dashes and quotes however
 * the prompt is worded, and a stray full stop breaks the bullet style.
 */
function cleanLine(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[‐-―−]/g, '-') // non-breaking and en/em dashes
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.;,]+$/, '')
    .trim()
}

/** Keep the clean, plausible lines and drop the rest. */
function cleanList(value: unknown, min: number): string[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    const line = cleanLine(raw)
    // A line long enough to be prose, or short enough to be a fragment, is not
    // a bullet the panel can show.
    if (line.length < 4 || line.length > 160) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out.length >= min ? out.slice(0, 6) : null
}

/** True when the market name is too thin to describe a trade. */
function isUsableMarket(market: string): boolean {
  return market.trim().length >= 3
}

/**
 * Ask the model for a market's lists. Returns null on any failure — a missing
 * key, a network error, a refusal, or an answer that does not survive cleaning —
 * so every caller falls back to the deterministic profile.
 */
export async function generateMethodologyParts(
  market: string,
  signal?: AbortSignal
): Promise<MethodologyParts | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey || !isUsableMarket(market)) return null

  try {
    const res = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        // This is a reasoning model and its reasoning counts against the
        // completion budget, so a tight ceiling cuts it off mid-JSON and the
        // whole call fails with json_validate_failed. Keep the budget wide and
        // the reasoning short — the task needs recall, not deliberation.
        reasoning_effort: 'low',
        max_completion_tokens: 3000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Market: ${market.trim()}` },
        ],
      }),
      signal,
    })

    if (!res.ok) {
      console.error(`methodology-llm: ${res.status} from Groq — ${(await res.text()).slice(0, 400)}`)
      return null
    }

    const body = await res.json()
    const content = body?.choices?.[0]?.message?.content
    if (typeof content !== 'string') return null

    const parsed = JSON.parse(content) as Record<string, unknown>
    const organisations = cleanList(parsed.organisations, 3)
    const designations = cleanList(parsed.designations, 3)
    const triggerSignals = cleanList(parsed.triggerSignals, 3)

    // Partial answers are not worth showing: a panel with one real list and two
    // fallback ones reads as inconsistent. All three or none.
    if (!organisations || !designations || !triggerSignals) return null

    return { organisations, designations, triggerSignals }
  } catch (err) {
    console.error('methodology-llm failed:', err instanceof Error ? err.message : err)
    return null
  }
}
