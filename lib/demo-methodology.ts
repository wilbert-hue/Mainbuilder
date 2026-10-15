/**
 * Demo METHODOLOGY block for the intelligence tables.
 *
 * An uploaded workbook carries its own METHODOLOGY rows above the table and
 * those always win. When the builder's static/demo toggle is on there is no
 * workbook, so the block is written from the market name instead: the same
 * three sections an analyst export uses, with the market's own subject
 * threaded through every line.
 *
 * Nothing here is market data. It describes how the directory *would* be
 * assembled, which is exactly what the locked preview is selling.
 */

import type { MethodologySection } from '@/lib/intelligence-sheet-types'
import { stripScopePrefix } from '@/lib/market-scope'
import {
  designationsFor,
  marketFlavour,
  organisationsFor,
  type MarketFlavour,
} from '@/lib/market-flavour'

/** "Brazil Advance Wound Care Market" → "Advance Wound Care". */
function marketSubject(market: string): string {
  let subject = stripScopePrefix(market)
  for (;;) {
    const next = subject.replace(/\s*(industry|market|analysis|report|devices?)\s*$/i, '').trim()
    if (next === subject || !next) break
    subject = next
  }
  return subject || market.trim()
}


/**
 * Events that mark a live buying window for this market. A retailer's buying
 * window opens on a range review or a new store, not on plant capacity.
 */
function triggerSignals(subject: string, flavour: MarketFlavour): string[] {
  const lower = subject.toLowerCase()
  if (flavour === 'consumer') {
    return [
      `Running a category range review covering ${lower}`,
      `Opening new stores or outlets that will stock ${lower}`,
      `Launching a private label or own-brand line in ${lower}`,
      `Expanding into a new region or export market with ${lower}`,
      `Listing ${lower} with a new wholesale or e-commerce channel`,
    ]
  }
  return [
    `Opening a new ${lower} facility or expanding existing capacity`,
    `Hiring specialists or certified staff for a new ${lower} programme`,
    `Launching a new ${lower} service line or dedicated team`,
    `Adding ${lower} equipment or upgrading installed systems`,
    `Securing accreditation or certification covering ${lower}`,
  ]
}

/**
 * The three-section block shown above a demo intelligence table.
 * Returns an empty array without a market name, so the caller can skip the panel.
 */
export function buildDemoMethodology(
  market: string | null | undefined,
  intelligenceSource: 'customer' | 'distributor' = 'customer'
): MethodologySection[] {
  const name = (market ?? '').trim()
  if (!name) return []

  const subject = marketSubject(name)
  const flavour = marketFlavour(name)
  const audience = intelligenceSource === 'distributor' ? 'distributors and channel partners' : 'buyers'

  return [
    {
      title: 'Primary Research',
      groups: [
        { title: 'Organizations we surveyed', items: organisationsFor(flavour) },
        { title: 'Designations we spoke to', items: designationsFor(flavour) },
      ],
      paragraphs: [
        `Verified telephone and email interviews with ${audience} active in ${subject}, re-validated every quarter.`,
      ],
    },
    {
      title: 'Real-time Trigger Signals',
      groups: [{ items: triggerSignals(subject, flavour) }],
      paragraphs: ['…and 50+ other trigger signals'],
    },
    {
      title: 'Intent Capture from Search Results (Real-time)',
      groups: [],
      paragraphs: [
        `Intent data is captured from the search and content behaviour of organisations researching ${subject}, then matched back to the company record so the directory reflects who is in-market now.`,
      ],
    },
  ]
}
