/**
 * Set the geography a dashboard's reports state (quadrant, B2B, B2C), which is
 * what the country strip above those tabs shows. Everything else is saved as is.
 *
 *   BUILDER_EMAIL=... BUILDER_PASSWORD=... npx tsx scripts/set-report-geo.ts <shared link> "U.S."
 */

import { gzipSync } from 'zlib'

async function main() {
  const [, , link, geo] = process.argv
  const m = link?.match(/^(https?:\/\/[^/]+)\/shared\/(?:.*--)?([0-9a-f]{24})/)
  if (!m || !geo) throw new Error('Usage: <shared link> <geography>')
  const [, base, id] = m

  const doc = await (await fetch(`${base}/api/dashboards/${id}`)).json()
  if (!doc?._id) throw new Error(`Dashboard ${id} not found`)
  for (const k of ['quadrantData', 'b2bSurveyData', 'b2cSurveyData']) {
    if (doc[k] && typeof doc[k] === 'object') {
      console.log(`${k}: ${doc[k].geo} → ${geo}`)
      doc[k].geo = geo
    }
  }

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
