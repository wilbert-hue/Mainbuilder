/**
 * Module names that depend on the market.
 *
 * A technology market does not sell through distributors — it sells through
 * channel partners: resellers, integrators, MSPs and ISVs. Calling that module
 * "Distributor Intelligence" in front of a software client reads as the wrong
 * report, so the market name decides what the module is called.
 */

/** Words that mean the market sells through partners rather than distributors. */
const TECHNOLOGY_MARKET =
  /\b(software|saas|platform|cloud|cyber\w*|analytics|digital|ai|artificial intelligence|machine learning|information technology|tech|technology|semiconductor|electronics|computing|network|networking|iot|telecom|telecommunications|5g|blockchain|fintech|automation|robotic|robotics|sensor|sensors|devops|erp|crm|data (centre|center|platform|management|analytics))\b/i

/** True when the market's own name says it is a technology market. */
export function isTechnologyMarket(marketName: string | null | undefined): boolean {
  return TECHNOLOGY_MARKET.test(marketName ?? '')
}

/** What the second intelligence module is called for this market. */
export function distributorModuleLabel(marketName: string | null | undefined): string {
  return isTechnologyMarket(marketName)
    ? 'Channel Partners and Potential Channel Partners'
    : 'Distributor Intelligence'
}

/** The short form, for a tab or a heading where the long label will not fit. */
export function distributorShortLabel(marketName: string | null | undefined): string {
  return isTechnologyMarket(marketName) ? 'Channel Partners' : 'Distributor Intelligence'
}

/** The singular noun for one of these companies: "distributor" or "channel partner". */
export function distributorNoun(marketName: string | null | undefined): string {
  return isTechnologyMarket(marketName) ? 'Channel Partner' : 'Distributor'
}

/** The database title under the module, naming what it lists. */
export function distributorDatabaseTitle(marketName: string | null | undefined): string {
  return isTechnologyMarket(marketName)
    ? 'Channel Partners and Potential Channel Partners'
    : 'Distributor Intelligence Database - Existing distributors and Potential distributors'
}
