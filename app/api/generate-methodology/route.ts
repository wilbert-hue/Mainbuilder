/**
 * Write a market's METHODOLOGY block with an LLM, once per market.
 *
 * The three sections above a demo customer directory used to come from a
 * hand-written industry table, which covers the industries we named and gives
 * everything else generic copy. This generates them from the market name
 * instead and caches the result in Mongo, so a market is paid for once and
 * every later dashboard and share link reads the stored copy.
 *
 * Failure is never fatal: without a key, or on any error, the response says so
 * and the caller keeps the deterministic block it already rendered.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getMongoClient } from '@/lib/mongodb'
import { getMongoDatabaseName } from '@/lib/mongo-config'
import { generateMethodologyParts } from '@/lib/methodology-llm'
import { composeMethodology } from '@/lib/demo-methodology'
import type { MethodologyParts } from '@/lib/methodology-parts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CACHE_COLLECTION = 'MethodologyCache'

/** One cache entry per market, regardless of which dashboard asked for it. */
function cacheKey(market: string): string {
  return market.trim().toLowerCase().replace(/\s+/g, ' ')
}

async function readCache(key: string): Promise<MethodologyParts | null> {
  try {
    const db = (await getMongoClient()).db(getMongoDatabaseName())
    const doc = await db.collection(CACHE_COLLECTION).findOne({ _id: key as never })
    const parts = (doc as { parts?: MethodologyParts } | null)?.parts
    return parts?.organisations?.length ? parts : null
  } catch (err) {
    // A cache that cannot be read is not an error worth failing the request for.
    console.error('methodology cache read failed:', err instanceof Error ? err.message : err)
    return null
  }
}

async function writeCache(key: string, market: string, parts: MethodologyParts): Promise<void> {
  try {
    const db = (await getMongoClient()).db(getMongoDatabaseName())
    await db
      .collection(CACHE_COLLECTION)
      .updateOne(
        { _id: key as never },
        { $set: { market, parts, generatedAt: new Date() } },
        { upsert: true }
      )
  } catch (err) {
    console.error('methodology cache write failed:', err instanceof Error ? err.message : err)
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
  if (cached) {
    return NextResponse.json({
      generated: true,
      cached: true,
      sections: composeMethodology(market, intelligenceSource, cached),
    })
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { generated: false, error: 'Methodology generation is not configured.' },
      { status: 503 }
    )
  }

  const parts = await generateMethodologyParts(market)
  if (!parts) {
    // The caller already has the deterministic block on screen, so this is a
    // "nothing better available" answer rather than a failure.
    return NextResponse.json({ generated: false })
  }

  await writeCache(key, market, parts)

  return NextResponse.json({
    generated: true,
    cached: false,
    sections: composeMethodology(market, intelligenceSource, parts),
  })
}
