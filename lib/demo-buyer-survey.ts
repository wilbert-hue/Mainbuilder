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
import {
  designationsFor,
  marketFlavour,
  organisationsFor,
  type MarketFlavour,
} from '@/lib/market-flavour'
import { buildB2bQuestionnaire } from '@/lib/demo-b2b-questions'
import { buildB2cQuestionnaire } from '@/lib/demo-b2c-questions'
import { consumerOfferingOf, offeringTypeOf } from '@/lib/demo-survey-offering'
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

/** Who buys, and how each buyer type buys. */
function buyerSegments(flavour: MarketFlavour): { whoBuys: string; segments: BuyerSegment[] } {
  if (flavour === 'consumer') {
    return {
      whoBuys:
        'Category buyers, merchandising managers, and supply chain professionals within retail chains, wholesale distributors, and hospitality groups that stock and resell the category.',
      segments: [
        { name: 'Supermarket and Grocery Chains', description: '' },
        { name: 'Specialty and Convenience Retailers', description: '' },
        { name: 'Hotels, Restaurants and Bars', description: '' },
        { name: 'Wholesalers and Online Retailers', description: '' },
      ],
    }
  }
  if (flavour === 'healthcare') {
    return {
      whoBuys:
        'Procurement officers, materials managers, and clinical supply chain professionals within healthcare institutions, long term care systems, and medical distribution networks.',
      segments: [
        { name: 'Hospitals and Acute Care Facilities', description: '' },
        { name: 'Specialty Clinics', description: '' },
        { name: 'Long Term Care and Nursing Facilities', description: '' },
        { name: 'Home Healthcare Agencies', description: '' },
      ],
    }
  }
  if (flavour === 'technology') {
    return {
      whoBuys:
        'IT procurement leads, platform owners, and digital transformation managers within enterprise, public sector, and high growth technology organisations.',
      segments: [
        { name: 'Large Enterprise IT Organisations', description: '' },
        { name: 'Managed Service Providers', description: '' },
        { name: 'Public Sector Technology Departments', description: '' },
        { name: 'Mid Market Shared Service Centres', description: '' },
      ],
    }
  }
  if (flavour === 'energy') {
    return {
      whoBuys:
        'Procurement heads, asset managers, and engineering leads within utilities, independent power producers, and heavy industrial energy consumers.',
      segments: [
        { name: 'Utility Operators', description: '' },
        { name: 'Independent Power Producers', description: '' },
        { name: 'Industrial Energy Consumers', description: '' },
        { name: 'Engineering and EPC Contractors', description: '' },
      ],
    }
  }
  return {
    whoBuys:
      'Procurement managers, category leads, and operations heads within manufacturing groups, distribution networks, and public sector buying bodies.',
    segments: [
      { name: 'Manufacturing Groups', description: '' },
      { name: 'Regional Industrial Operators', description: '' },
      { name: 'Distribution and Trading Networks', description: '' },
      { name: 'Public Sector Procurement Bodies', description: '' },
    ],
  }
}


/** Consumer-side job titles do not apply; a B2C panel is profiled instead. */
const B2C_RESPONDENT_PROFILE = [
  'Primary household decision maker',
  'Joint decision maker with a partner',
  'Buys for personal use only',
  'Buys on behalf of a dependent or family member',
  'First time category buyer',
  'Repeat buyer across several brands',
]

/** Who the consumer respondents are, by household rather than by firm. */
const B2C_HOUSEHOLDS = [
  'Urban single person households',
  'Young families with children at home',
  'Dual income households without children',
  'Multi generational households',
  'Retired and empty nest households',
]

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

/** Who buys, when the buyer is a shopper rather than a firm. */
function consumerSegments(subject: string): { whoBuys: string; segments: BuyerSegment[] } {
  return {
    whoBuys: `Individual shoppers who have bought ${subject.toLowerCase()} for themselves or their household in the last 12 months, screened on category purchase and decision-making role.`,
    segments: [
      { name: 'Regular Category Buyers', description: '' },
      { name: 'Occasional and Seasonal Buyers', description: '' },
      { name: 'First-Time Buyers', description: '' },
      { name: 'Premium and Brand-Led Buyers', description: '' },
    ],
  }
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
export function buildDemoBuyerSurvey(
  data: ComparisonData | null | undefined,
  dashboardName?: string | null,
  kind: 'b2b' | 'b2c' = 'b2b'
): BuyerSurveyReport | null {
  const market = (dashboardName || data?.metadata?.market_name || '').trim()
  if (!market) return null

  const subject = marketSubject(market)
  const flavour = marketFlavour(subject)
  const geo = data?.dimensions?.geographies?.all_geographies?.[0] || marketScopeLabel(market)
  const isConsumer = kind === 'b2c'
  const sampleSize = sampleSizeFor(market, geo, kind)
  const module = isConsumer ? 'Voice of Customer (B2C)' : 'Voice of Customer (B2B)'

  const buyers = isConsumer ? consumerSegments(subject) : buyerSegments(flavour)
  const segments = isConsumer
    ? toSurveySegments(buildB2cQuestionnaire(subject, consumerOfferingOf(market)), sampleSize)
    : toSurveySegments(buildB2bQuestionnaire(subject, geo, offeringTypeOf(market)), sampleSize)
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
        : `Organisations that buy ${lower} ${where} for their own operations.`,
      whoBuys: buyers.whoBuys,
      buyerSegments: buyers.segments,
      organisationsHeading: isConsumer ? 'Households We Surveyed' : 'Organisations We Surveyed',
      organisations: isConsumer ? B2C_HOUSEHOLDS : organisationsFor(flavour),
      designationsHeading: isConsumer ? 'Who We Spoke To' : 'Designations We Spoke To',
      designations: isConsumer ? B2C_RESPONDENT_PROFILE : designationsFor(flavour),
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
        ? B2C_RESPONDENT_PROFILE.slice(0, 4)
        : [
            `Direct purchasing authority for ${lower}`,
            'Involved in specifying or approving suppliers',
            'Bought within the current purchase cycle',
          ],
      reportConfidence: '',
    },
    executiveSummary: null,
    segments,
    questionCount,
  }
}
