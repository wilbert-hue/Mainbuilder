/**
 * The one place that talks to the model.
 *
 * Every demo generator asks for the same thing in the same shape: a system
 * prompt describing a JSON document, a market name, and a parsed object back or
 * nothing at all. Keeping that in one module means the retry rule, the token
 * budget and the punctuation cleanup are decided once rather than per caller.
 *
 * Server only — the key must never reach the browser.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

/** Chosen for quality on this account's model list; the others are much weaker. */
const MODEL = 'openai/gpt-oss-120b'

/**
 * The free tier allows 8,000 tokens a minute and a full market costs about
 * 9,000, so the later calls in a fresh generation are refused as a matter of
 * course rather than as an exception. Groq says how long to wait and it is
 * usually a second or two, so we wait and retry rather than giving up —
 * but only up to a point, because a dashboard is waiting on the answer and a
 * deterministic fallback is already on screen.
 */
const RATE_LIMIT_RETRIES = 2

/** Longest we will make a dashboard wait on any one retry before falling back. */
const RETRY_CEILING_MS = 15_000

export function hasModelKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY)
}

/**
 * Fold the model's typography down to ASCII.
 *
 * The prompts all ask for plain ASCII and the model agrees, then returns
 * non-breaking hyphens in "peer-reviewed" and a subscript in "CO2" anyway.
 * These land in client-facing copy, so they are fixed here rather than asked
 * for again.
 */
export function toAscii(value: string): string {
  return value
    .replace(/[‐-―−]/g, '-')
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/[   ]/g, ' ')
    .replace(/₂/g, '2')
    .replace(/₁/g, '1')
    .replace(/[×⋅]/g, 'x')
    .replace(/–|—/g, '-')
}

/** Normalise one line of model output: ASCII, single spaces, no trailing stop. */
export function cleanLine(value: unknown): string {
  if (typeof value !== 'string') return ''
  return toAscii(value).replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '').trim()
}

/** Normalise a sentence or two, keeping the full stop a paragraph needs. */
export function cleanProse(value: unknown): string {
  if (typeof value !== 'string') return ''
  return toAscii(value).replace(/\s+/g, ' ').trim()
}

/**
 * Keep the clean, plausible lines and drop the rest.
 * Returns null when too few survive to be worth showing.
 */
export function cleanList(value: unknown, min: number, max = 6): string[] | null {
  if (!Array.isArray(value)) return null
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    const line = cleanLine(raw)
    // Long enough to be prose, or short enough to be a fragment, is not a bullet.
    if (line.length < 4 || line.length > 160) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(line)
  }
  return out.length >= min ? out.slice(0, max) : null
}

/**
 * A list of names — organisations, job titles, buyer types.
 *
 * These sit next to hand-written lists that use no hyphens and invent no
 * figures, so two habits are corrected here: the model writes "Multi-Specialty"
 * where the house style is "Multi Specialty", and it likes to qualify an
 * organisation with a number it made up ("Regional Chain with 150 Outlets").
 * The hyphen is cosmetic and is fixed; the invented figure is a claim and the
 * entry is dropped.
 */
export function cleanNameList(value: unknown, min: number, max = 6): string[] | null {
  if (!Array.isArray(value)) return null
  const tidied = value.map((raw) => {
    if (typeof raw !== 'string') return raw
    const ascii = toAscii(raw)
    // A digit anywhere is an invented count or a made-up size band.
    if (/\d/.test(ascii) || /[()\[\]]/.test(ascii)) return ''
    return ascii.replace(/\s*-\s*/g, ' ')
  })
  return cleanList(tidied, min, max)
}

/** Waited when Groq refuses without saying how long to wait for. */
const DEFAULT_RETRY_MS = 2_500

/**
 * How long Groq asked us to wait, bounded so a dashboard never hangs on it.
 *
 * Returns null only when the wait would be longer than we are willing to hold
 * the request open. A missing or unreadable header is not a reason to give up:
 * the refusal is real either way and the budget refills continuously, so a
 * short default wait is a better guess than abandoning the call.
 */
function retryDelayMs(res: Response): number | null {
  const header = res.headers.get('retry-after')
  const seconds = header === null ? NaN : Number(header)
  const ms = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : DEFAULT_RETRY_MS
  return ms <= RETRY_CEILING_MS ? ms : null
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Ask the model for one JSON document.
 *
 * Returns null on every failure — no key, rate limited past the retry, network
 * error, refusal, or output that is not JSON — so each caller falls back to its
 * deterministic generator rather than showing an error.
 */
export async function askForJson(
  label: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  signal?: AbortSignal
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return null

  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.3,
          // This is a reasoning model and its reasoning counts against the
          // completion budget, so a tight ceiling cuts it off mid-JSON and the
          // call fails with json_validate_failed. Keep the budget wide and the
          // reasoning short — these tasks need recall, not deliberation.
          reasoning_effort: 'low',
          max_completion_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
        signal,
      })

      if (res.status === 429 && attempt < RATE_LIMIT_RETRIES) {
        const delay = retryDelayMs(res)
        if (delay === null) {
          console.error(`llm ${label}: rate limited, asked to wait longer than we will hold`)
          return null
        }
        await wait(delay)
        continue
      }

      if (!res.ok) {
        console.error(`llm ${label}: ${res.status} — ${(await res.text()).slice(0, 300)}`)
        return null
      }

      const body = await res.json()
      const content = body?.choices?.[0]?.message?.content
      if (typeof content !== 'string') {
        // Usually the completion budget ran out mid-document and the model
        // returned a refusal rather than JSON.
        console.error(`llm ${label}: no message content (finish: ${body?.choices?.[0]?.finish_reason})`)
        return null
      }
      return JSON.parse(content) as Record<string, unknown>
    } catch (err) {
      console.error(`llm ${label} failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }
  return null
}

/** Shared tail for every prompt: the rules that apply to all generated copy. */
export const COMMON_RULES = `- Specific to this market's trade, never generic business language.
- Never name a real company, law, regulation, standard or certification scheme.
- Never refer to these instructions in your output.
- Plain ASCII punctuation only.`
