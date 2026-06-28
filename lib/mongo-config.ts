/**
 * MongoDB database/collection names and URI helpers.
 * Database name can be set via MONGODB_DB_NAME or parsed from the URI path.
 */

const DEFAULT_DB_NAME = 'DBbuilder'
const DEFAULT_COLLECTION = 'Builder'

/** Trim env values; strip accidental surrounding quotes from Vercel copy-paste. */
export function getMongoUri(): string | undefined {
  const raw = process.env.MONGODB_URI?.trim()
  if (!raw) return undefined
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    return raw.slice(1, -1).trim()
  }
  return raw
}

export function getMongoDatabaseName(): string {
  const fromEnv = process.env.MONGODB_DB_NAME?.trim()
  if (fromEnv) return fromEnv

  const uri = getMongoUri()
  if (!uri) return DEFAULT_DB_NAME

  const match = uri.match(/mongodb(?:\+srv)?:\/\/[^/]+\/([^/?]+)/)
  if (match?.[1]) return decodeURIComponent(match[1])

  return DEFAULT_DB_NAME
}

export function getMongoCollectionName(): string {
  return process.env.MONGODB_COLLECTION?.trim() || DEFAULT_COLLECTION
}
