import { adminDb } from '@/server/firebase-admin'
import type { Membership } from './types'

export async function getMembership(
  workspaceId: string,
  userId: string,
): Promise<Membership | null> {
  const doc = await adminDb
    .doc(`workspaces/${workspaceId}/members/${userId}`)
    .get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Membership
}

export async function listWorkspaceMembers(workspaceId: string): Promise<Membership[]> {
  const snap = await adminDb
    .collection(`workspaces/${workspaceId}/members`)
    .get()
  return snap.docs.map(d => ({
    id: d.id,
    ...d.data(),
    joinedAt: d.data().joinedAt?.toDate?.() ?? new Date(),
  } as Membership))
}
