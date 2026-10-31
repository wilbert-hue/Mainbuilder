/**
 * Demo Voice of Customer (B2B) report.
 *
 * Builds the full shape of a buyer survey from the market workbook alone — the
 * same idea as the demo Coherent Quadrant and the static Proposition 1
 * template. The buyer landscape, the sections and the question wording are all
 * written from the market's own name and segmentation, so the preview reads as
 * this market's study.
 *
 * What is deliberately missing is the data: every question carries no options
 * and no takeaway, and the view renders a lock in place of the chart. Selling
 * the questionnaire is the point; the answers are what a subscription buys.
 */

import type { ComparisonData } from '@/lib/types'
import { marketScopeLabel, stripScopePrefix } from '@/lib/market-scope'
import { marketFlavour } from '@/lib/market-flavour'
import { buildB2bQuestionnaire } from '@/lib/demo-b2b-questions'
import { buildB2cQuestionnaire } from '@/lib/demo-b2c-questions'
import { consumerOfferingOf, offeringTypeOf } from '@/lib/demo-survey-offering'
import type { B2bLandscapeParts, QuestionSectionPart } from '@/lib/demo-generation-types'
import {
  buildLandscape,
  consumerProfiles,
  consumerRespondents,
  reportConfidence,
} from '@/lib/demo-survey-landscape'
import type {
  BuyerSegment,
  BuyerSurveyQuestion,
  BuyerSurveyReport,
  BuyerSurveySegment,
} from '@/lib/buyer-survey-types'

/** Respondent count quoted on the title card and every question header. */
const DEMO_SAMPLE_SIZE = 120

/** "Brazil Advance Wound Care Market" → "Advance Wound Care". */
function marketSubject(market: string): string {
  let subject = stripScopePrefix(market)
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report)\s*$/i, '').trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market.trim()
}


/** Turn generated text into the shape the view renders, answers withheld. */
function toSurveySegments(
  sections: { title: string; focus: string; questions: { text: string; type: string }[] }[],
  sampleSize: number
): BuyerSurveySegment[] {
  let counter = 0
  return sections.map((section, i) => ({
    id: `demo-section-${i + 1}`,
    title: section.title,
    focus: section.focus,
    questions: section.questions.map<BuyerSurveyQuestion>((q) => {
      counter += 1
      return {
        id: `Q${counter}`,
        text: q.text,
        type: q.type,
        chartType: null,
        // Empty by design: the view locks the chart and the takeaway.
        options: [],
        keyInsight: '',
        n: sampleSize,
        confidence: null,
        sources: [],
      }
    }),
  }))
}


/**
 * Build the demo buyer survey for a market.
 *
 * A workbook is not required — the market name carries the questionnaire — so
 * a dashboard can be this survey and nothing else. The B2C variant asks a
 * shopper about habit, price and channel; the B2B one asks a firm about
 * contracts, budget and approval. Returns null only when there is no market
 * to name.
 */
/**
 * Sample sizes the framework asks for: a B2B study of one country runs 30 to
 * 35 buyers, a global one 100 to 150; a consumer panel runs into the hundreds.
 * Derived from the market name so a dashboard always quotes the same number.
 */
function sampleSizeFor(market: string, geo: string, kind: 'b2b' | 'b2c'): number {
  let hash = 0
  for (let i = 0; i < market.length; i++) hash = (hash * 31 + market.charCodeAt(i)) >>> 0
  const isGlobal = /^global$/i.test(geo.trim())
  if (kind === 'b2c') return 300 + (hash % 400)
  if (isGlobal) return 100 + (hash % 50)
  return 30 + (hash % 6)
}

/**
 * Build the demo buyer survey for a market.
 *
 * A workbook is not required — the market name carries the questionnaire — so
 * a dashboard can be this survey and nothing else. The B2C variant asks a
 * shopper about what they bought, where and what they paid; the B2B one asks
 * an organisation about buying, use, performance and future investment.
 * Returns null only when there is no market to name.
 */
/**
 * The generated sections carry a title and questions but no focus line, which
 * the view prints under each tab. These describe what each section is for, and
 * are phrased against the market's subject the way the deterministic ones are.
 */
const GENERATED_FOCUS: Record<'b2b' | 'b2c', [string, string, string, string]> = {
  b2b: [
    'How buyers of {s} choose, qualify and contract their suppliers.',
    'How, where and why {s} is used inside the buying organisation.',
    'How {s} has performed in service and what value it returned.',
    'Where demand, upgrades and investment in {s} are heading.',
  ],
  b2c: [
    'What buyers of {s} chose, and what decided it.',
    'Where buyers of {s} shop, and what they pay.',
    'How the {s} they bought has performed, and what it was worth.',
    'What buyers of {s} will buy next.',
  ],
}

function withFocus(
  sections: QuestionSectionPart[],
  kind: 'b2b' | 'b2c',
  subject: string
): { title: string; focus: string; questions: { text: string; type: string }[] }[] {
  const lines = GENERATED_FOCUS[kind]
  const lower = subject.toLowerCase()
  return sections.map((section, i) => ({
    title: section.title,
    focus: (lines[i] ?? lines[lines.length - 1]).replace('{s}', lower),
    questions: section.questions,
  }))
}

export function buildDemoBuyerSurvey(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null,
  kind: 'b2b' | 'b2c' = 'b2b',
  /** Generated copy for this market, when the model wrote some. */
  generated?: {
    b2bLandscape?: B2bLandscapeParts
    b2bQuestions?: QuestionSectionPart[]
    b2cQuestions?: QuestionSectionPart[]
  } | null
): BuyerSurveyReport | null {
  const market = (dashboardName || data?.metadata?.market_name || '').trim()
  if (!market) return null

  const subject = marketSubject(market)
  const flavour = marketFlavour(subject)
  const geo = data?.dimensions?.geographies?.all_geographies?.[0] || marketScopeLabel(market)
  const isConsumer = kind === 'b2c'
  const sampleSize = sampleSizeFor(market, geo, kind)
  const module = isConsumer ? 'Voice of Customer (B2C)' : 'Voice of Customer (B2B)'

  const offering = offeringTypeOf(market)
  const landscape = buildLandscape(subject, geo, flavour, offering)

  // A generated questionnaire has already passed the framework rules in
  // `questions-llm.ts`; anything that failed them arrives here as undefined and
  // the deterministic questionnaire is written instead.
  const generatedQuestions = isConsumer ? generated?.b2cQuestions : generated?.b2bQuestions
  const segments = generatedQuestions?.length
    ? toSurveySegments(withFocus(generatedQuestions, kind, subject), sampleSize)
    : isConsumer
      ? toSurveySegments(buildB2cQuestionnaire(subject, consumerOfferingOf(market)), sampleSize)
      : toSurveySegments(buildB2bQuestionnaire(subject, geo, offering), sampleSize)

  // The B2B header is generated against the methodology's lists so the two
  // panels stop showing the same organisations and designations twice.
  const generatedLandscape = isConsumer ? undefined : generated?.b2bLandscape
  const questionCount = segments.reduce((sum, s) => sum + s.questions.length, 0)

  const lower = subject.toLowerCase()
  const where = /^global$/i.test(geo.trim()) ? 'worldwide' : `in ${geo}`

  return {
    kind,
    industry: market,
    module,
    geo,
    sector: subject,
    sampleSize,
    analystName: '',
    analystTitle: '',
    sampleBreakdown: {},
    landscape: {
      definition: isConsumer
        ? `People who buy ${lower} for themselves or their home ${where}.`
        : landscape.definition,
      whoBuys: isConsumer
        ? `Individual buyers of ${lower} ${where}, answering for themselves or their household. Buyers fall into four profiles.`
        : generatedLandscape?.buyersIntro || landscape.whoBuys,
      // Consumers are described by how they buy; organisations by what they are.
      buyerSegments: isConsumer
        ? consumerProfiles(subject)
        : generatedLandscape?.buyerTypes ?? landscape.segments,
      organisationsHeading: isConsumer ? 'Customers We Surveyed' : 'Organisations We Surveyed',
      organisations: isConsumer
        ? consumerRespondents(subject, geo)
        : generatedLandscape?.organisations ?? landscape.organisations,
      designationsHeading: 'Designations We Spoke To',
      // A consumer study has no job titles to list.
      designations: isConsumer ? [] : generatedLandscape?.designations ?? landscape.designations,
      respondentProfile: '',
    },
    methodology: {
      // The framework's wording, so the demo reads like the delivered report.
      approach: isConsumer
        ? `We surveyed ${sampleSize} verified buyers of ${lower} ${where} — each answering for themselves or their own household, not the market at large.`
        : `We surveyed ${sampleSize} verified buyers with direct purchasing responsibility for ${lower} ${where} — each answering for their own organisation, not the market at large. Every response was cross checked against published trade and market data for accuracy.`,
      sampleSize,
      geography: geo,
      module,
      reportCovers: segments.map((s) => s.title),
      whoQualified: isConsumer
        ? consumerRespondents(subject, geo)
        : [
            `Direct purchasing authority for ${lower}`,
            'Involved in specifying or approving suppliers',
            'Bought within the current purchase cycle',
          ],
      reportConfidence: reportConfidence(subject, geo),
    },
    executiveSummary: null,
    segments,
    questionCount,
  }
}
