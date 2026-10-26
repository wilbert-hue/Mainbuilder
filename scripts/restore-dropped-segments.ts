/**
 * Put back segments that the data carries but the segment list lost.
 *
 * The label filter once treated "standalone" as model narration, so a segment
 * such as "Standalone Vacuum Insulation Panels" kept its numbers but vanished
 * from the filters and taxonomy. This re-adds every top-level segment found in
 * the value/volume records to its segment type, and saves everything else as is.
 *
 *   BUILDER_EMAIL=... BUILDER_PASSWORD=... npx tsx scripts/restore-dropped-segments.ts <shared link>
 */

import { gzipSync } from 'zlib'

async function main() {
  const link = process.argv[2]
  const m = link?.match(/^(https?:\/\/[^/]+)\/shared\/(?:.*--)?([0-9a-f]{24})/)
  if (!m) throw new Error('Usage: <shared link>')
  const [, base, id] = m

  const doc = await (await fetch(`${base}/api/dashboards/${id}`)).json()
  if (!doc?.data?.dimensions?.segments) throw new Error(`Dashboard ${id} has no market data`)

  const segments = doc.data.dimensions.segments as Record<string, { items: string[]; hierarchy?: Record<string, string[]> }>
  const restored: string[] = []
  for (const metric of ['value', 'volume']) {
    for (const rec of doc.data.data?.[metric]?.geography_segment_matrix ?? []) {
      const dim = segments[rec.segment_type]
      const top = rec.segment_hierarchy?.level_1
      if (!dim || !top || dim.items.includes(top)) continue
      dim.items.push(top)
      if (dim.hierarchy && !dim.hierarchy[top]) dim.hierarchy[top] = []
      restored.push(`${rec.segment_type}: ${top}`)
    }
  }
  if (restored.length === 0) return console.log('Nothing missing.')
  console.log('Restoring:\n  ' + restored.join('\n  '))

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.BUILDER_EMAIL, password: process.env.BUILDER_PASSWORD }),
  })
  if (!login.ok) throw new Error(`Login failed (${login.status})`)
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0]

  const keys = [
    'name', 'currency', 'data', 'intelligenceType', 'rawIntelligenceData', 'proposition2Data',
    'proposition3Data', 'distributorRawIntelligenceData', 'distributorProposition2Data',
    'distributorProposition3Data', 'pricingAnalysisData', 'buyerSurveyType', 'b2bSurveyData',
    'b2cSurveyData', 'quadrantData', 'showDemoNote', 'showDemoQuadrant', 'showDemoB2bSurvey',
    'showDemoB2cSurvey', 'staticCustomerProp1', 'staticDistributorProp1', 'logoChoice',
  ]
  const payload: Record<string, unknown> = { dashboardId: id }
  for (const k of keys) payload[k] = doc[k]

  const res = await fetch(`${base}/api/dashboards/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ _compressed: true, payload: gzipSync(JSON.stringify(payload)).toString('base64') }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `save ${res.status}`)
  console.log(`Saved ${body.id}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
