/**
 * Replace a dashboard's B2B survey with one report per region.
 *
 * Every other field is read back from the dashboard and saved unchanged; the
 * first JSON becomes the default report, and all of them become `regions`, so
 * the country strip lists exactly those geographies.
 *
 *   BUILDER_EMAIL=... BUILDER_PASSWORD=... npx tsx scripts/set-regional-b2b-survey.ts \
 *     https://host/shared/<slug>--<id> north-america.json europe.json
 */

import * as fs from 'fs'
import { gzipSync } from 'zlib'
import { parseBuyerSurvey } from '../lib/buyer-survey-types'

async function main() {
  const [, , link, ...files] = process.argv
  const m = link?.match(/^(https?:\/\/[^/]+)\/shared\/(?:.*--)?([0-9a-f]{24})/)
  if (!m || files.length === 0) throw new Error('Usage: <shared link> <survey.json>...')
  const [, base, id] = m

  const reports = files.map((f) => {
    const { report, error } = parseBuyerSurvey(JSON.parse(fs.readFileSync(f, 'utf8')), 'b2b')
    if (!report) throw new Error(`${f}: ${error}`)
    console.log(`${f} → ${report.geo} (${report.questionCount} questions)`)
    return report
  })

  const login = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: process.env.BUILDER_EMAIL, password: process.env.BUILDER_PASSWORD }),
  })
  if (!login.ok) throw new Error(`Login failed (${login.status})`)
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0]

  const doc = await (await fetch(`${base}/api/dashboards/${id}`)).json()
  if (!doc?._id) throw new Error(`Dashboard ${id} not found`)

  const payload = {
    name: doc.name,
    currency: doc.currency,
    dashboardId: id,
    data: doc.data,
    intelligenceType: doc.intelligenceType,
    rawIntelligenceData: doc.rawIntelligenceData,
    proposition2Data: doc.proposition2Data,
    proposition3Data: doc.proposition3Data,
    distributorRawIntelligenceData: doc.distributorRawIntelligenceData,
    distributorProposition2Data: doc.distributorProposition2Data,
    distributorProposition3Data: doc.distributorProposition3Data,
    pricingAnalysisData: doc.pricingAnalysisData,
    buyerSurveyType: doc.buyerSurveyType === 'b2c' ? 'both' : doc.buyerSurveyType || 'b2b',
    b2bSurveyData: { ...reports[0], regions: reports },
    b2cSurveyData: doc.b2cSurveyData,
    quadrantData: doc.quadrantData,
    showDemoNote: doc.showDemoNote,
    showDemoQuadrant: doc.showDemoQuadrant,
    showDemoB2bSurvey: doc.showDemoB2bSurvey,
    showDemoB2cSurvey: doc.showDemoB2cSurvey,
    staticCustomerProp1: doc.staticCustomerProp1,
    staticDistributorProp1: doc.staticDistributorProp1,
    logoChoice: doc.logoChoice,
  }

  const res = await fetch(`${base}/api/dashboards/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ _compressed: true, payload: gzipSync(JSON.stringify(payload)).toString('base64') }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `save ${res.status}`)
  console.log(`Saved ${body.id} with regions: ${reports.map((r) => r.geo).join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
