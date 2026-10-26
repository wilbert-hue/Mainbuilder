/**
 * Bulk-create demo dashboards for every market in the SATEL scope workbook.
 *
 * For each market row (column A = market, column E = "Segmentation Types") it:
 *   1. builds demo Value + Volume workbooks over the full global geography,
 *   2. posts them to /api/process-excel, exactly as the builder UI does,
 *   3. saves the dashboard via /api/dashboards/save with every demo view on:
 *      demo note, demo quadrant, demo B2B survey, static customer and
 *      distributor Proposition 1 templates,
 *   4. writes every share link to an Excel file.
 *
 * Runs against the live builder (override with BUILDER_BASE_URL):
 *   BUILDER_EMAIL=you@example.com BUILDER_PASSWORD=... npx tsx scripts/create-satel-dashboards.ts "<workbook.xlsx>" "<out.xlsx>"
 */

import * as path from 'path'
import * as XLSX from 'xlsx'
import { gzipSync } from 'zlib'

const BASE = (process.env.BUILDER_BASE_URL || 'https://mainbuilder.vercel.app').replace(/\/$/, '')
const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || BASE).replace(/\/$/, '')
const EMAIL = (process.env.BUILDER_EMAIL || '').trim().toLowerCase()
const PASSWORD = process.env.BUILDER_PASSWORD || ''
const [, , inFile = '../SATEL Business Related Market (1).xlsx', outFile = '../SATEL Dashboard Links.xlsx'] = process.argv

// ── geography (every region we normally cover) ──────────────────────────────
const GEOGRAPHY: Record<string, { share: number; countries: Record<string, number> }> = {
  'North America': { share: 0.34, countries: { 'U.S.': 0.86, Canada: 0.14 } },
  Europe: { share: 0.26, countries: { 'U.K.': 0.17, Germany: 0.22, Italy: 0.11, France: 0.15, Spain: 0.09, Russia: 0.08, 'Rest of Europe': 0.18 } },
  'Asia Pacific': { share: 0.25, countries: { China: 0.36, India: 0.13, Japan: 0.17, 'South Korea': 0.08, ASEAN: 0.1, Australia: 0.07, 'Rest of Asia Pacific': 0.09 } },
  'Latin America': { share: 0.07, countries: { Brazil: 0.42, Argentina: 0.14, Mexico: 0.28, 'Rest of Latin America': 0.16 } },
  'Middle East': { share: 0.05, countries: { GCC: 0.58, Israel: 0.2, 'Rest of Middle East': 0.22 } },
  Africa: { share: 0.03, countries: { 'North Africa': 0.38, 'Central Africa': 0.22, 'South Africa': 0.4 } },
}
const YEARS = Array.from({ length: 13 }, (_, i) => 2021 + i) // 2021–2033
const BASE_YEAR = 2025

// ── deterministic randomness, so a re-run gives the same numbers ─────────────
function rng(seedText: string) {
  let h = 2166136261
  for (const c of seedText) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "By Offering: a; b; c. By Application: d; e." → [{ type, items }] */
function parseSegmentation(text: string) {
  return text
    .split(/(?=\bBy [A-Z][^:]{1,60}:)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const colon = part.indexOf(':')
      const type = part.slice(0, colon)
      const rest = part.slice(colon + 1)
      const items = rest
        .replace(/\.\s*$/, '')
        .split(';')
        .map((x) => capitalise(x.trim().replace(/\.$/, '')))
        .filter(Boolean)
      return { type: type.trim(), items }
    })
    .filter((s) => s.items.length > 0)
}

function marketTitle(name: string) {
  let n = name.trim()
  if (!/market$/i.test(n)) n += ' Market'
  return /^global\b/i.test(n) ? n : `Global ${n}`
}

/** Demo Value (US$ Mn) and Volume (Th units) sheets for one market. */
function buildWorkbooks(market: string, segments: { type: string; items: string[] }[]) {
  const r = rng(market)
  const globalBase = 600 + r() * 2400 // US$ Mn in the base year
  const cagr = 0.055 + r() * 0.045
  const unitPrice = 450 + r() * 1300 // US$ per unit
  const header = ['Region', 'Country', 'Segment', 'Sub-segment', ...YEARS.map(String)]
  const valueRows: any[][] = [header]
  const volumeRows: any[][] = [header]

  // One share split per segment type, nudged per country so geographies differ.
  const baseShares = segments.map((s) => s.items.map(() => 0.5 + r()))

  for (const [region, { share, countries }] of Object.entries(GEOGRAPHY)) {
    for (const [country, cShare] of Object.entries(countries)) {
      const countryBase = globalBase * share * cShare
      const countryCagr = cagr + (r() - 0.5) * 0.02
      segments.forEach((seg, si) => {
        const w = baseShares[si].map((b) => b * (0.85 + r() * 0.3))
        const total = w.reduce((a, b) => a + b, 0)
        seg.items.forEach((item, ii) => {
          const itemShare = w[ii] / total
          const itemCagr = countryCagr + (r() - 0.5) * 0.02
          const values = YEARS.map((y) => +(countryBase * itemShare * Math.pow(1 + itemCagr, y - BASE_YEAR)).toFixed(2))
          const price = unitPrice * (0.8 + r() * 0.4)
          const volumes = values.map((v) => +((v * 1e6) / price / 1e3).toFixed(2))
          valueRows.push([region, country, seg.type, item, ...values])
          volumeRows.push([region, country, seg.type, item, ...volumes])
        })
      })
    }
  }

  const toBuffer = (rows: any[][]) => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Data')
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  }
  return { value: toBuffer(valueRows), volume: toBuffer(volumeRows) }
}

async function main() {
  const { buildStaticCustomerTemplate, buildStaticDistributorTemplate } = await import('../lib/static-customer-template')

  // Sign in through the builder's own login, as the account that will own the dashboards.
  if (!PASSWORD) throw new Error('Set BUILDER_EMAIL and BUILDER_PASSWORD to your builder login')
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!login.ok) throw new Error(`Login failed: ${(await login.json().catch(() => ({}))).error || login.status}`)
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0]

  // Markets: rows whose column E holds a "By …:" segmentation.
  const sheet = XLSX.readFile(path.resolve(inFile))
  const rows = XLSX.utils.sheet_to_json<any[]>(sheet.Sheets[sheet.SheetNames[0]], { header: 1, defval: '' })
  let category = ''
  const markets: { category: string; name: string; segmentation: string }[] = []
  for (const row of rows) {
    const a = String(row[0] || '').trim()
    const e = String(row[4] || '').trim()
    if (/^\d+\.\s/.test(a) && !e) category = a.replace(/^\d+\.\s*/, '')
    else if (a && /\bBy [A-Z][^:]*:/.test(e)) markets.push({ category, name: a, segmentation: e })
  }
  console.log(`${markets.length} markets found`)

  const results: any[][] = [['#', 'Category', 'Market', 'Dashboard Name', 'Segment Types', 'Link', 'Status']]
  for (const [i, m] of markets.entries()) {
    const title = marketTitle(m.name)
    const segments = parseSegmentation(m.segmentation)
    try {
      const { value, volume } = buildWorkbooks(title, segments)
      const form = new FormData()
      form.append('valueFile', new Blob([new Uint8Array(value)]), `${title} - Value.xlsx`)
      form.append('volumeFile', new Blob([new Uint8Array(volume)]), `${title} - Volume.xlsx`)
      form.append('volumeUnit', 'th-units')
      const pRes = await fetch(`${BASE}/api/process-excel`, { method: 'POST', body: form, headers: { cookie } })
      const processed = await pRes.json()
      if (!pRes.ok) throw new Error(processed.details || processed.error || `process-excel ${pRes.status}`)
      const { _ingestMetrics, _dashboardId, ...data } = processed

      const payload = {
        name: title,
        currency: 'USD',
        dashboardId: _dashboardId,
        data,
        intelligenceType: 'both',
        rawIntelligenceData: buildStaticCustomerTemplate(data, title),
        proposition2Data: null,
        proposition3Data: null,
        distributorRawIntelligenceData: buildStaticDistributorTemplate(),
        distributorProposition2Data: null,
        distributorProposition3Data: null,
        pricingAnalysisData: null,
        buyerSurveyType: 'b2b',
        b2bSurveyData: null,
        b2cSurveyData: null,
        quadrantData: null,
        showDemoNote: true,
        showDemoQuadrant: true,
        showDemoB2bSurvey: true,
        showDemoB2cSurvey: false,
        staticCustomerProp1: true,
        staticDistributorProp1: true,
        logoChoice: 'coherent',
      }
      const sRes = await fetch(`${BASE}/api/dashboards/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        // Same gzip envelope the builder uses, to stay under Vercel's body limit.
        body: JSON.stringify({ _compressed: true, payload: gzipSync(JSON.stringify(payload)).toString('base64') }),
      })
      const saved = await sRes.json()
      if (!sRes.ok) throw new Error(saved.error || `save ${sRes.status}`)
      // The local server names its own origin; the link must point at the live site.
      const link = String(saved.shareUrl).replace(/^https?:\/\/[^/]+/, PUBLIC_ORIGIN)
      console.log(`[${i + 1}/${markets.length}] ${title}\n    ${link}`)
      results.push([i + 1, m.category, m.name, title, segments.map((s) => s.type).join('; '), link, 'Created'])
    } catch (err) {
      console.error(`[${i + 1}/${markets.length}] ${title} FAILED:`, err)
      results.push([i + 1, m.category, m.name, title, segments.map((s) => s.type).join('; '), '', `Failed: ${(err as Error).message}`])
    }
  }

  const out = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(results)
  ws['!cols'] = [{ wch: 4 }, { wch: 45 }, { wch: 55 }, { wch: 62 }, { wch: 50 }, { wch: 110 }, { wch: 12 }]
  for (let r = 1; r < results.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 5 })]
    if (cell?.v) cell.l = { Target: String(cell.v) }
  }
  XLSX.utils.book_append_sheet(out, ws, 'Dashboard Links')
  XLSX.writeFile(out, path.resolve(outFile))
  console.log(`\nLinks written to ${path.resolve(outFile)}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
