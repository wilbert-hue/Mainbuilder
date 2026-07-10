import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { checkAdminAccess } from '@/lib/auth/admin'
import { getMongoClient } from '@/lib/mongodb'
import { getMongoDatabaseName, getMongoCollectionName } from '@/lib/mongo-config'

export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await checkAdminAccess(user.uid)
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const client = await getMongoClient()
  const collection = client
    .db(getMongoDatabaseName())
    .collection(getMongoCollectionName())

  const result = await collection.deleteMany({
    $or: [{ ownerId: null }, { ownerId: { $exists: false } }],
  })

  return NextResponse.json({ deletedCount: result.deletedCount })
}
