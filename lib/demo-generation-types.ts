/**
 * Shapes for the generated demo content.
 *
 * Kept free of any server import so a client component can name these types
 * without pulling the model key's module into the browser bundle.
 */

import type { MethodologySection } from '@/lib/intelligence-sheet-types'

/** One kind of company the quadrant compares. */
export interface ProviderCategoryPart {
  name: string
  description: string
}

/**
 * What the market actually is. Generated first, because every other generator
 * needs it — and because it is what stops a survey asking which brand of Diet
 * Coke you buy.
 */
export interface MarketProfileParts {
  /** The thing being bought, with "Global", "Market" and any country stripped. */
  subject: string
  /** True when the market name is one brand, not a category containing brands. */
  isBrand: boolean
  audience: 'b2b' | 'b2c' | 'both'
  offering: string
  /** Two sentences on what the market covers — the Market Type panel. */
  definition: string
  providerCategories: ProviderCategoryPart[]
  /** The noun a question uses to ask what was bought. Never "brand" if isBrand. */
  askUnit: string
}

/** One scoring parameter on either quadrant axis. */
export interface ScoringParameterPart {
  name: string
  definition: string
}

export interface QuadrantParts {
  xAxisName: string
  yAxisName: string
  xParameters: ScoringParameterPart[]
  yParameters: ScoringParameterPart[]
}

/**
 * The B2B tab's header. Deliberately separate from the customer intelligence
 * methodology: the two panels sat on the same `buildLandscape` call and so
 * showed identical lists, which is the duplication this replaces.
 */
export interface B2bLandscapeParts {
  /** One sentence above the buyer cards. */
  buyersIntro: string
  /** The buyer type cards: a kind of buyer and how it buys. */
  buyerTypes: { name: string; description: string }[]
  organisations: string[]
  designations: string[]
  /** The four question tab titles, in this market's own words. */
  sectionTitles: string[]
}

export interface GeneratedQuestionPart {
  text: string
  type: 'single_choice' | 'multi_choice'
}

export interface QuestionSectionPart {
  title: string
  questions: GeneratedQuestionPart[]
}

/** Everything generated for one market, as cached and as served. */
export interface DemoGeneration {
  profile?: MarketProfileParts
  methodology?: MethodologySection[]
  quadrant?: QuadrantParts
  b2bLandscape?: B2bLandscapeParts
  b2bQuestions?: QuestionSectionPart[]
  b2cQuestions?: QuestionSectionPart[]
}

/** The slices a caller can request, so a tab only pays for what it renders. */
export type DemoGenerationPart = keyof DemoGeneration
