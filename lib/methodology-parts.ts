/**
 * The three lists a methodology block is built from.
 *
 * Kept apart from both producers — the deterministic industry profile and the
 * LLM route — so a client component can name the type without pulling the
 * server-only Groq module into the browser bundle.
 */
export interface MethodologyParts {
  organisations: string[]
  designations: string[]
  triggerSignals: string[]
}
