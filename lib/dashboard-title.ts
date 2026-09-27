/**
 * Dashboard heading text.
 *
 * Once a buyer survey is loaded the dashboard covers the full intelligence
 * suite, so the market name is expanded to spell out the modules it ships with.
 */

export const SUITE_MODULES = [
  'Customer Intelligence',
  'Distributor Intelligence',
  'Vendor Intelligence',
  'Customer Survey',
  'Future Outlook',
]

export function expandDashboardTitle(name: string, includeSuite: boolean): string {
  const base = name.trim()
  if (!includeSuite || !base) return base
  return [base, ...SUITE_MODULES].join(', ')
}

/** The modules line rendered under the market name, or "" when not applicable. */
export function suiteSubtitle(includeSuite: boolean): string {
  return includeSuite ? SUITE_MODULES.join(', ') : ''
}
