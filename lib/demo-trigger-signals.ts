/**
 * Real-time trigger signals.
 *
 * An observable event inside a company that says it is likely to buy soon:
 * capacity expansion, a new line, a site opening, hiring for a named role, a
 * certification or regulatory change, a contract win, funding released.
 *
 * Each line is specific to this market's buyers, at most 18 words, with no
 * numbering and no company names. The signals differ by what the market
 * sells — a plant expansion matters to an equipment seller, a range review to
 * someone selling into retail.
 */

import type { OfferingType } from '@/lib/demo-survey-offering'
import type { MarketFlavour } from '@/lib/market-flavour'

type Signal = (subject: string) => string

const BY_OFFERING: Record<OfferingType, Signal[]> = {
  Equipment: [
    (s) => `New plant or site announced that will need ${s} from the first day`,
    (s) => `Capacity expansion approved that lifts how much ${s} is required`,
    (s) => `Hiring maintenance or operations engineers to run ${s}`,
    (s) => `Tender won that commits the buyer to new ${s} capacity`,
    (s) => `Safety certification or inspection due that forces an upgrade to ${s}`,
    (s) => `Capital budget released for ${s} replacement`,
  ],
  'Material / Ingredient': [
    (s) => `New product line announced that needs ${s} in the formulation`,
    (s) => `Reformulation underway to meet a new label or regulatory rule`,
    (s) => `Processing capacity expanded, raising the volume of ${s} consumed`,
    (s) => `Hiring formulation or quality roles tied to ${s}`,
    (s) => `Supplier approval or audit opened for a second ${s} source`,
    (s) => `Export approval secured that requires documented ${s} sourcing`,
  ],
  Service: [
    (s) => `New site, route or asset added that needs ${s} coverage`,
    (s) => `Existing ${s} contract approaching renewal or retender`,
    (s) => `Hiring roles that manage or supervise ${s} delivery`,
    (s) => `Regulator inspection scheduled that requires ${s} evidence`,
    (s) => `Budget approved to outsource ${s} previously done in house`,
    (s) => `Incident or failure that puts current ${s} arrangements under review`,
  ],
  Platform: [
    (s) => `Migration or modernisation programme announced that needs ${s}`,
    (s) => `Hiring technology or data roles tied to ${s}`,
    (s) => `Security or compliance audit forcing a review of ${s}`,
    (s) => `Funding round or budget cycle releasing spend on ${s}`,
    (s) => `Merger, new site or market entry expanding who uses ${s}`,
    (s) => `Current ${s} licence approaching its renewal date`,
  ],
  Technology: [
    (s) => `Pilot or proof of concept started for ${s}`,
    (s) => `Hiring engineering or analytics roles tied to ${s}`,
    (s) => `Regulatory or reporting change that ${s} is needed to meet`,
    (s) => `Funding or grant secured for a ${s} programme`,
    (s) => `Partnership announced that brings ${s} into the operation`,
    (s) => `Ageing installed technology reaching the end of its support`,
  ],
  System: [
    (s) => `New facility or line being built that needs ${s} installed`,
    (s) => `Modernisation of ageing ${s} approved by the board`,
    (s) => `Hiring project or commissioning engineers for ${s}`,
    (s) => `Compliance deadline that the current ${s} cannot meet`,
    (s) => `Contract awarded for works that include ${s}`,
    (s) => `Capital plan published with ${s} named in it`,
  ],
  Solution: [
    (s) => `Programme announced to deliver the outcome ${s} is bought for`,
    (s) => `Hiring programme or infrastructure roles tied to ${s}`,
    (s) => `Existing ${s} contract approaching renewal`,
    (s) => `Expansion into a new site or region that extends ${s}`,
    (s) => `Audit or compliance change that the current ${s} cannot satisfy`,
    (s) => `Capital approval released for a ${s} rollout`,
  ],
  Product: [
    (s) => `New outlet, plant or warehouse opening that will stock ${s}`,
    (s) => `Range review opened in the ${s} category`,
    (s) => `Own label or private label programme launched in ${s}`,
    (s) => `Hiring category, buying or quality roles covering ${s}`,
    (s) => `Entry into a new region or channel that needs ${s} supply`,
    (s) => `Certification or labelling change affecting approved ${s} suppliers`,
  ],
}

/** Healthcare buyers signal differently: accreditation, beds, new departments. */
const HEALTHCARE: Signal[] = [
  (s) => `New department, ward or clinic opening that will use ${s}`,
  (s) => `Accreditation or inspection due that covers ${s} practice`,
  (s) => `Hiring clinical or procurement roles tied to ${s}`,
  (s) => `Tender published by a hospital group covering ${s}`,
  (s) => `Treatment protocol updated to include ${s}`,
  (s) => `Capital grant released for ${s} equipment or supply`,
]

/** Retail and hospitality buyers signal through listings, outlets and seasons. */
const CONSUMER_TRADE: Signal[] = [
  (s) => `New store or outlet opening that will list ${s}`,
  (s) => `Category range review opened that covers ${s}`,
  (s) => `Own label programme launched in the ${s} category`,
  (s) => `Hiring category buyers or merchandisers for ${s}`,
  (s) => `Expansion into a new city or channel that needs ${s} supply`,
  (s) => `Supplier audit or listing window opened for ${s}`,
]

/**
 * Six signals for a market, each a single observable event. Returns them in
 * the order they would be acted on, strongest intent first.
 */
export function triggerSignalsFor(
  subject: string,
  flavour: MarketFlavour,
  offering: OfferingType
): string[] {
  const lower = subject.toLowerCase()
  const signals =
    flavour === 'healthcare'
      ? HEALTHCARE
      : flavour === 'consumer'
        ? CONSUMER_TRADE
        : BY_OFFERING[offering]
  return signals.map((signal) => signal(lower))
}
