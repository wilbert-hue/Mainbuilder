/**
 * MongoDB connection singleton (lazy, serverless-friendly).
 */

import { MongoClient } from 'mongodb'
import { getMongoUri } from './mongo-config'

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

/** Tuned for Vercel/serverless: no min pool, short timeouts, no strict Server API. */
const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  connectTimeoutMS: 15_000,
  socketTimeoutMS: 45_000,
  serverSelectionTimeoutMS: 15_000,
}

function missingUriError(): Error {
  return new Error(
    'MONGODB_URI is not defined. Set it in Vercel → Project → Settings → Environment Variables, ' +
      'or in .env.local:\nMONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/DBbuilder'
  )
}

export function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoUri()
  if (!uri) {
    return Promise.reject(missingUriError())
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined
      throw err
    })
  }

  return global._mongoClientPromise
}

/** Quick connectivity check for health/debug endpoints. */
export async function pingMongo(): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await getMongoClient()
    await client.db('admin').command({ ping: 1 })
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

const lazyClientPromise: Promise<MongoClient> = {
  then(onFulfilled, onRejected) {
    return getMongoClient().then(onFulfilled, onRejected)
  },
  catch(onRejected) {
    return getMongoClient().catch(onRejected)
  },
  finally(onFinally) {
    return getMongoClient().finally(onFinally)
  },
} as Promise<MongoClient>

export default lazyClientPromise
