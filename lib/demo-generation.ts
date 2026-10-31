/**
 * Generate everything a demo dashboard needs for one market.
 *
 * The order matters more than it looks. The market profile runs first because
 * every other generator needs to know whether the market name is a category or
 * a single brand, and the B2B landscape runs after the methodology so it can be
 * told which lists are already on screen and write different ones.
 *
 * Nothing here throws. Each generator returns null on failure and the caller
 * keeps whatever deterministic content it already rendered, so a dashboard with
 * no key, a rate limit, or a model that broke the rules looks exactly like it
 * did before any of this existed.
 *
 * Server only.
 */

import { generateMarketProfile } from '@/lib/market-profile-llm'
import { generateMethodologyParts } from '@/lib/methodology-llm'
import { generateQuadrantParts } from '@/lib/quadrant-llm'
import { generateB2bLandscape } from '@/lib/b2b-landscape-llm'
import { generateQuestionnaire } from '@/lib/questions-llm'
import type { MethodologyParts } from '@/lib/methodology-parts'
import type {
  MarketProfileParts,
  QuadrantParts,
  B2bLandscapeParts,
  QuestionSectionPart,
} from '@/lib/demo-generation-types'

/**
 * What is stored per market. The methodology is held as its three lists rather
 * than as rendered sections: the wrapper copy around them lives in code, so it
 * can be reworded without every cached market going stale.
 */
export interface DemoGenerationRecord {
  profile?: MarketProfileParts
  methodologyParts?: MethodologyParts
  quadrant?: QuadrantParts
  b2bLandscape?: B2bLandscapeParts
  b2bQuestions?: QuestionSectionPart[]
  b2cQuestions?: QuestionSectionPart[]
}

/** True when the record has nothing worth caching. */
export function isEmptyRecord(record: DemoGenerationRecord): boolean {
  return !Object.values(record).some((value) =>
    Array.isArray(value) ? value.length > 0 : Boolean(value)
  )
}

/**
 * Run the generators for a market.
 *
 * `have` is whatever was already cached; anything present there is left alone,
 * so a market that gained a new section only pays for the new section.
 */
export async function generateDemoContent(
  market: string,
  have: DemoGenerationRecord = {},
  signal?: AbortSignal
): Promise<DemoGenerationRecord> {
  const out: DemoGenerationRecord = { ...have }

  // 1 — what the market is. Without it the questionnaires cannot be written,
  // so a failure here stops the two that depend on it but not the rest.
  if (!out.profile) {
    out.profile = (await generateMarketProfile(market, signal)) ?? undefined
  }

  // 2 — the two that depend on nothing but the market name.
  const [methodologyParts, quadrant] = await Promise.all([
    out.methodologyParts ? Promise.resolve(out.methodologyParts) : generateMethodologyParts(market, signal),
    out.quadrant ? Promise.resolve(out.quadrant) : generateQuadrantParts(market, signal),
  ])
  out.methodologyParts = methodologyParts ?? undefined
  out.quadrant = quadrant ?? undefined

  // 3 — the B2B header, told what the methodology already shows so the two
  // panels stop printing the same two lists.
  if (!out.b2bLandscape) {
    const avoid = out.methodologyParts
      ? {
          organisations: out.methodologyParts.organisations,
          designations: out.methodologyParts.designations,
        }
      : null
    out.b2bLandscape = (await generateB2bLandscape(market, avoid, signal)) ?? undefined
  }

  // 4 — the questionnaires, which need the profile for the brand rule and the
  // landscape for the tab titles.
  //
  // Run one after the other, not together. They are the two most expensive
  // calls, and by the time they run a fresh market has already spent most of
  // the minute's token budget; firing both at once means both are refused,
  // where running them in turn gives the budget time to refill between them.
  if (out.profile) {
    const profile = out.profile
    if (!out.b2bQuestions) {
      const titles = out.b2bLandscape?.sectionTitles ?? null
      out.b2bQuestions =
        (await generateQuestionnaire(market, profile, 'b2b', titles, signal)) ?? undefined
    }
    if (!out.b2cQuestions) {
      out.b2cQuestions =
        (await generateQuestionnaire(market, profile, 'b2c', null, signal)) ?? undefined
    }
  }

  return out
}
