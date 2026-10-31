/**
 * Write a market's demo content with an LLM, once per market.
 *
 * Supersedes /api/generate-methodology, which generated only the customer
 * intelligence block. That route still works and reads its own cache; this one
 * covers the quadrant parameters, the B2B header and both questionnaires as
 * well, and stores them together so a market is paid for once.
 *
 * Failure is never fatal: without a key, or on any error, the response says so
 * and each caller keeps the deterministic content it already rendered.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMongoClient } from '@/lib/mongodb'
import { getMongoDatabaseName } from '@/lib/mongo-config'
import { generateDemoContent, isEmptyRecord } from '@/lib/demo-generation'
import type { DemoGenerationRecord } from '@/lib/demo-generation'
import { composeMethodology } from '@/lib/demo-methodology'
import type { DemoGeneration } from '@/lib/demo-generation-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_COLLECTION = 'DemoGenerationCache'

/** One cache entry per market, regardless of which dashboard asked for it. */
function cacheKey(market: string): string {
  return market.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function readCache(key: string): Promise<DemoGenerationRecord | null> {
  try {
    const db = (await getMongoClient()).db(getMongoDatabaseName())
    const doc = await db.collection(CACHE_COLLECTION).findOne({ _id: key as never })
    const record = (doc as { record?: DemoGenerationRecord } | null)?.record
    return record && !isEmptyRecord(record) ? record : null
  } catch (err) {
    // A cache that cannot be read is not worth failing the request for.
    console.error('demo cache read failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function writeCache(key: string, market: string, record: DemoGenerationRecord): Promise<void> {
  try {
    const db = (await getMongoClient()).db(getMongoDatabaseName())
    await db
      .collection(CACHE_COLLECTION)
      .updateOne(
        { _id: key as never },
        { $set: { market, record, generatedAt: new Date() } },
        { upsert: true }
      )
  } catch (err) {
    console.error('demo cache write failed:', err instanceof Error ? err.message : err)
  }
}

/** True once every slice we know how to generate is present. */
function isComplete(record: DemoGenerationRecord): boolean {
  return Boolean(
    record.profile &&
      record.methodologyParts &&
      record.quadrant &&
      record.b2bLandscape &&
      record.b2bQuestions?.length &&
      record.b2cQuestions?.length
  )
}

/** Turn the stored parts into what the dashboard renders. */
function present(
  market: string,
  record: DemoGenerationRecord,
  intelligenceSource: 'customer' | 'distributor'
): DemoGeneration {
  return {
    profile: record.profile,
    methodology: record.methodologyParts
      ? composeMethodology(market, intelligenceSource, record.methodologyParts)
      : undefined,
    quadrant: record.quadrant,
    b2bLandscape: record.b2bLandscape,
    b2bQuestions: record.b2bQuestions,
    b2cQuestions: record.b2cQuestions,
  }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ generated: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const market = typeof body.market === 'string' ? body.market.trim() : ''
  const intelligenceSource = body.intelligenceSource === 'distributor' ? 'distributor' : 'customer'

  if (!market) {
    return NextResponse.json({ generated: false, error: 'market is required.' }, { status: 400 })
  }

  const key = cacheKey(market)
  const cached = await readCache(key)

  // A complete entry is served without touching the model at all — which is
  // what keeps a day of demos inside the free tier's token budget.
  if (cached && isComplete(cached)) {
    return NextResponse.json({
      generated: true,
      cached: true,
      content: present(market, cached, intelligenceSource),
    })
  }

  if (!process.env.GROQ_API_KEY) {
    // A partial entry is still better than nothing for the sections it covers.
    if (cached) {
      return NextResponse.json({
        generated: true,
        cached: true,
        content: present(market, cached, intelligenceSource),
      })
    }
    return NextResponse.json(
      { generated: false, error: 'Demo generation is not configured.' },
      { status: 503 }
    )
  }

  const record = await generateDemoContent(market, cached ?? {})
  if (isEmptyRecord(record)) {
    // Every caller already has deterministic content on screen, so this is a
    // "nothing better available" answer rather than a failure.
    return NextResponse.json({ generated: false })
  }

  await writeCache(key, market, record)

  return NextResponse.json({
    generated: true,
    cached: false,
    content: present(market, record, intelligenceSource),
  })
}
