import { NextRequest, NextResponse } from 'next/server'
import {
  upsertDashboardWithId,
  newDashboardId,
  getDashboard,
  isValidDashboardId,
} from '@/lib/dashboard-mongo'
import { assignPartition } from '@/lib/partition'
import { cacheSet, cacheInvalidate } from '@/lib/slave-cache'
import { getPublicAppOrigin } from '@/lib/app-origin'
import { parseIntelligenceSheet } from '@/lib/intelligence-sheet-types'
import { getPublicMongoErrorMessage } from '@/lib/mongo-errors'
import { getMongoUri } from '@/lib/mongo-config'
import {
  decodeSaveRequestBody,
  persistMarketData,
  persistJsonField,
} from '@/lib/dashboard-snapshot-persist'
import { getCurrentUser } from '@/lib/auth/current-user'

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'dashboard'
}
import type { ComparisonData } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: NextRequest) {
  // Auth guard: only logged-in builders may create/update dashboards.
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: 'You must be signed in to create a dashboard.' }, { status: 401 })
  }

  if (!getMongoUri()) {
    return NextResponse.json(
      {
        error:
          'Database is not configured on the server. In Vercel → Settings → Environment Variables, add MONGODB_URI (same as your .env.local), then redeploy.',
      },
      { status: 503 }
    )
  }

  let body: Record<string, unknown>

  try {
    const raw = await request.json()
    body = decodeSaveRequestBody(raw as Record<string, unknown>)
  } catch {
    return NextResponse.json({ error: 'Request body is not valid JSON.' }, { status: 400 })
  }

  const {
    data,
    rawIntelligenceData,
    pricingAnalysisData,
    dashboardId,
    b2bSurveyData,
    b2cSurveyData,
    quadrantData,
  } = body

  if (!data && !rawIntelligenceData && !pricingAnalysisData && !b2bSurveyData && !b2cSurveyData && !quadrantData) {
    return NextResponse.json(
      { error: 'No dashboard data provided. Upload at least one data file before generating a link.' },
      { status: 400 }
    )
  }

  try {
    const existingId = isValidDashboardId(dashboardId) ? (dashboardId as string) : null

    // Resolve the dashboardId up front: blob keys are namespaced by id, so we
    // must know it before offloading to object storage. For updates we reuse
    // the existing id (and its partition); for new dashboards we mint one.
    let partitionKey = 0
    let id: string
    let ownerId: string = currentUser.uid

    if (existingId) {
      const existing = await getDashboard(existingId)
      partitionKey = existing?.partitionKey ?? (await assignPartition())
      id = existingId
      ownerId = existing?.ownerId ?? currentUser.uid
    } else {
      partitionKey = await assignPartition()
      id = newDashboardId()
    }

    const [marketPersist, pricingPersist, b2bPersist, b2cPersist, quadrantPersist] = await Promise.all([
      persistMarketData(data as ComparisonData | null | undefined, id),
      persistJsonField(pricingAnalysisData, id, 'pricing'),
      persistJsonField(b2bSurveyData, id, 'b2b-survey'),
      persistJsonField(b2cSurveyData, id, 'b2c-survey'),
      persistJsonField(quadrantData, id, 'quadrant'),
    ])

    const payload = {
      name: typeof body.name === 'string' ? body.name : 'Untitled Dashboard',
      currency:
        body.currency === 'INR' ? ('INR' as const) :
        body.currency === 'EUR' ? ('EUR' as const) :
        ('USD' as const),
      partitionKey,
      data: marketPersist.data,
      dataCompressed: marketPersist.dataCompressed,
      dataS3Key: marketPersist.dataS3Key,
      intelligenceType: (body.intelligenceType as any) ?? null,
      rawIntelligenceData: parseIntelligenceSheet(body.rawIntelligenceData),
      proposition2Data: parseIntelligenceSheet(body.proposition2Data),
      proposition3Data: parseIntelligenceSheet(body.proposition3Data),
      distributorRawIntelligenceData: parseIntelligenceSheet(body.distributorRawIntelligenceData),
      distributorProposition2Data: parseIntelligenceSheet(body.distributorProposition2Data),
      distributorProposition3Data: parseIntelligenceSheet(body.distributorProposition3Data),
      pricingAnalysisData: pricingPersist.inline,
      pricingAnalysisCompressed: pricingPersist.compressed,
      pricingAnalysisS3Key: pricingPersist.s3Key,
      buyerSurveyType: (['b2b', 'b2c', 'both'].includes(body.buyerSurveyType as string)
        ? body.buyerSurveyType
        : null) as 'b2b' | 'b2c' | 'both' | null,
      b2bSurveyData: b2bPersist.inline,
      b2bSurveyCompressed: b2bPersist.compressed,
      b2bSurveyS3Key: b2bPersist.s3Key,
      b2cSurveyData: b2cPersist.inline,
      b2cSurveyCompressed: b2cPersist.compressed,
      b2cSurveyS3Key: b2cPersist.s3Key,
      quadrantData: quadrantPersist.inline,
      quadrantCompressed: quadrantPersist.compressed,
      quadrantS3Key: quadrantPersist.s3Key,
      showDemoNote: body.showDemoNote === true,
      showDemoQuadrant: body.showDemoQuadrant === true,
      logoChoice: (['wmr', 'mi'].includes(body.logoChoice as string) ? body.logoChoice : 'coherent') as 'coherent' | 'wmr' | 'mi',
      ownerId,
    }

    await upsertDashboardWithId(id, existingId, payload)

    try {
      cacheInvalidate(id, partitionKey)
      // Warm the cache with the data we already hold in memory, so reads right
      // after a save are instant and we avoid an immediate blob-store round trip.
      const cacheDoc = {
        _id: id,
        ...payload,
        data: (data as ComparisonData | null) ?? null,
        pricingAnalysisData: pricingAnalysisData ?? null,
        b2bSurveyData: b2bSurveyData ?? null,
        b2cSurveyData: b2cSurveyData ?? null,
        quadrantData: quadrantData ?? null,
        readCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      cacheSet(id, partitionKey, cacheDoc)
    } catch (cacheErr) {
      console.warn('[dashboards/save] Cache warm failed (non-fatal):', cacheErr)
    }

    const origin = getPublicAppOrigin(request)
    if (!origin) {
      return NextResponse.json(
        {
          error:
            'Could not determine a public URL for this link. Set NEXT_PUBLIC_APP_URL on Vercel to your site URL (e.g. https://your-app.vercel.app) and redeploy.',
        },
        { status: 500 }
      )
    }

    const shareUrl = `${origin}/shared/${slugify(payload.name)}--${id}`
    return NextResponse.json(
      { id, shareUrl },
      { status: 201 }
    )
  } catch (err) {
    console.error('[dashboards/save] Error:', err)
    const { message, status } = getPublicMongoErrorMessage(err)
    return NextResponse.json({ error: message }, { status })
  }
}
