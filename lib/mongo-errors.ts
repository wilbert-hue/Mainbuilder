/** Map Mongo/driver errors to user-facing save/load messages (no secrets). */

export function getPublicMongoErrorMessage(err: unknown): {
  message: string
  status: number
} {
  const msg =
    err instanceof Error
      ? `${err.message}${err.cause instanceof Error ? ` (${err.cause.message})` : ''}`
      : String(err)

  if (msg.includes('MONGODB_URI is not defined')) {
    return {
      message:
        'Database is not configured on the server. In Vercel → Settings → Environment Variables, add MONGODB_URI (same value as .env.local), then redeploy.',
      status: 503,
    }
  }

  if (
    msg.includes('MongoServerSelectionError') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('timed out') ||
    msg.includes('ETIMEOUT')
  ) {
    return {
      message:
        'Cannot connect to MongoDB. In MongoDB Atlas → Network Access, allow access from anywhere (0.0.0.0/0), then verify MONGODB_URI on Vercel.',
      status: 503,
    }
  }

  if (
    msg.includes('Authentication failed') ||
    msg.includes('bad auth') ||
    msg.includes('auth failed') ||
    msg.includes('Invalid credentials')
  ) {
    return {
      message:
        'MongoDB login failed. Check the username and password in MONGODB_URI (special characters in the password must be URL-encoded).',
      status: 503,
    }
  }

  if (
    msg.includes('BSONObjectTooLarge') ||
    msg.includes('document is larger than') ||
    msg.includes('maximum allowed size') ||
    msg.includes('DASHBOARD_TOO_LARGE')
  ) {
    return {
      message:
        'Dashboard data is too large to save (~3,500+ rows). Reduce geographies or segments in Excel, then upload and share again.',
      status: 413,
    }
  }

  return {
    message: 'Could not save the dashboard. Please try again.',
    status: 500,
  }
}
