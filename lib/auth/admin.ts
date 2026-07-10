import { isUserAdmin } from './users'

export async function checkAdminAccess(uid: string): Promise<boolean> {
  return isUserAdmin(uid)
}
