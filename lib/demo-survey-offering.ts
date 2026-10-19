/**
 * What a market mainly sells, in the eight types the CMI survey framework uses.
 *
 * The offering type decides which themes each survey section must cover, so it
 * is read once here and used by both the B2B and the B2C generators.
 */

export type OfferingType =
  | 'Product'
  | 'Technology'
  | 'Material / Ingredient'
  | 'Service'
  | 'Equipment'
  | 'Platform'
  | 'System'
  | 'Solution'

/** Ordered: the first pattern that matches wins, so the narrow tests come first. */
const RULES: { type: OfferingType; test: RegExp }[] = [
  {
    type: 'Service',
    test: /\b(services?|servicing|inspection|testing|maintenance|consult\w*|training|logistics|outsourc\w*|repair|surveying|monitoring|trials?|audit\w*|certification)\b/i,
  },
  {
    type: 'Platform',
    test: /\b(platform|saas|software|app|apps|subscription|marketplace|portal|gis|erp|crm|analytics suite)\b/i,
  },
  {
    type: 'Material / Ingredient',
    test: /\b(ingredient|additive|antioxidants?|lactoferrin|emulsifier|enzyme|polymer|resin|film|coating|chemical|compound|excipient|fibre|fiber|pigment|protein|extract|acid|powder|material|alloy|composite)\b/i,
  },
  {
    type: 'Equipment',
    test: /\b(equipment|machine\w*|device|devices|instrument|pump|valve|electroly[sz]er|robot|robotics|drone|drones|vehicle|hardware|tool|tools|apparatus|systems? integrator|turbine|generator|compressor|battery|batteries|cell|cells)\b/i,
  },
  {
    type: 'System',
    test: /\b(system|systems|infrastructure|network|grid|automation|control|installation)\b/i,
  },
  {
    type: 'Solution',
    test: /\b(solution|solutions|digital twin|data cent(er|re)|smart city|end to end|managed)\b/i,
  },
  {
    type: 'Technology',
    test: /\b(technology|technologies|ai|artificial intelligence|machine learning|remote sensing|iot|blockchain|5g|digital|cloud|cyber\w*|semiconductor|sensor|sensors)\b/i,
  },
]

/** The offering type for a market, read off its name. Defaults to Product. */
export function offeringTypeOf(marketName: string | null | undefined): OfferingType {
  const name = marketName ?? ''
  for (const rule of RULES) if (rule.test.test(name)) return rule.type
  return 'Product'
}

/**
 * Consumer-facing shape, for the B2C survey's third section: a consumable is
 * asked about taste and quality, a durable about reliability and warranty.
 */
export type ConsumerOffering = 'consumable' | 'durable' | 'service' | 'digital'

export function consumerOfferingOf(marketName: string | null | undefined): ConsumerOffering {
  const name = marketName ?? ''
  if (/\b(app|apps|software|subscription|streaming|platform|online|digital|saas|game|games)\b/i.test(name)) {
    return 'digital'
  }
  if (/\b(insurance|telecom|education|travel|healthcare|banking|services?|tuition|membership|delivery)\b/i.test(name)) {
    return 'service'
  }
  if (
    /\b(appliance\w*|electronics|vehicle\w*|car|cars|phone|smartphone|laptop|tv|television|furniture|machine\w*|equipment|device|devices|footwear|watch\w*|bike|scooter)\b/i.test(name)
  ) {
    return 'durable'
  }
  return 'consumable'
}
