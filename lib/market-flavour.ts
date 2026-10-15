/**
 * What kind of market this is, read off its name.
 *
 * The demo generators each need to know who buys in a market before they can
 * write a buyer landscape, a methodology or a scoring rationale for it. They
 * used to decide that separately, which is how "Accounts Payable Automation"
 * ended up classed as a manufacturer in one place and software in another.
 * One classifier, used by all of them.
 */

export type MarketFlavour = 'healthcare' | 'technology' | 'energy' | 'consumer' | 'industrial'

/** Goods a shopper buys: food, drink, personal care, household, apparel. */
const CONSUMER =
  /\b(food|beverages?|drinks?|whisk(?:y|ey)|spirits?|wine|beer|rum|vodka|gin|cider|juice|coffee|tea|dairy|snacks?|confectioner\w*|chocolate|bakery|cereal|sauce|seasoning|nutraceutical|supplements?|infant formula|pet food|cosmetics?|skin\s?care|hair\s?care|personal care|beauty|fragrance|perfume|toiletr\w*|apparel|footwear|clothing|luxury|jewell?ery|watch(?:es)?|furniture|homeware|household|toys?|games?|grocery|retail|fmcg|consumer goods|packaged goods|tobacco|vape|e-?cigarette)\b/i

const HEALTHCARE =
  /\b(health\w*|medical|clinic\w*|hospital|wound|surgical|patient|pharma\w*|diagnost\w*|therapy|therapeutics?|device|dental|orthop\w*|vaccine|biotech\w*|drug)\b/i

const TECHNOLOGY =
  /\b(software|saas|platform|cloud|cyber\w*|analytics|digital|ai|artificial intelligence|machine learning|information technology|tech|technology|semiconductor|electronics|computing|network|networking|iot|telecom\w*|5g|blockchain|fintech|automation|robotic\w*|sensors?|devops|erp|crm)\b/i

const ENERGY =
  /\b(energy|power|oil|gas|solar|wind|battery|batteries|grid|utility|utilities|renewable|fuel|hydrogen|nuclear|petrochemical|refin\w*)\b/i

/**
 * Order matters where a name matches more than one: a *medical* device is a
 * healthcare market before it is a technology one, and a consumer good is
 * consumer even when it is also food science.
 */
export function marketFlavour(marketName: string | null | undefined): MarketFlavour {
  const name = marketName ?? ''
  if (HEALTHCARE.test(name)) return 'healthcare'
  if (CONSUMER.test(name)) return 'consumer'
  if (TECHNOLOGY.test(name)) return 'technology'
  if (ENERGY.test(name)) return 'energy'
  return 'industrial'
}

/** True for markets whose goods reach a shelf rather than a plant. */
export function isConsumerMarket(marketName: string | null | undefined): boolean {
  return marketFlavour(marketName) === 'consumer'
}

/** The organisations a buyer-side study of this market would survey. */
export function organisationsFor(flavour: MarketFlavour): string[] {
  switch (flavour) {
    case 'healthcare':
      return [
        'Multinational hospital chains',
        'Regional public healthcare networks',
        'Large non profit nursing home networks',
        'Independent private clinics',
        'Mid sized home healthcare groups',
      ]
    case 'technology':
      return [
        'Global enterprise IT organisations',
        'Regional managed service providers',
        'Public sector technology departments',
        'High growth technology companies',
        'Mid market shared service centres',
      ]
    case 'energy':
      return [
        'National utility operators',
        'Independent power producers',
        'Industrial energy consumers',
        'Engineering and EPC contractors',
        'Regional grid infrastructure operators',
      ]
    case 'consumer':
      return [
        'National supermarket and grocery chains',
        'Specialty and convenience retail groups',
        'Hotel, restaurant and bar operators',
        'Wholesale and cash-and-carry distributors',
        'Online marketplaces and e-commerce retailers',
      ]
    default:
      return [
        'Multinational manufacturing groups',
        'Regional industrial operators',
        'Large distribution and trading networks',
        'Independent mid sized producers',
        'Public sector procurement bodies',
      ]
  }
}

/** The job titles that qualify for a buyer-side interview in this market. */
export function designationsFor(flavour: MarketFlavour): string[] {
  if (flavour === 'consumer') {
    return [
      'Category Buyer',
      'Merchandising Manager',
      'Procurement Manager',
      'Private Label Lead',
      'Head of Buying',
      'Supply Chain Lead',
    ]
  }
  return [
    'Procurement Manager',
    'Purchasing Specialist',
    'Supply Chain Lead',
    'Category Manager',
    'Head of Operations',
    'Technical Evaluation Lead',
  ]
}
