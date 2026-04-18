import { adminDb } from '@/server/firebase-admin'
import type { PipelineItem, PipelineStatus } from './types'

export async function listPipelineItems(
  workspaceId: string,
  options: { status?: PipelineStatus; customerId?: string } = {},
): Promise<PipelineItem[]> {
  let q = adminDb
    .collection(`workspaces/${workspaceId}/pipeline`)
    .orderBy('updatedAt', 'desc') as FirebaseFirestore.Query

  if (options.status) {
    q = q.where('status', '==', options.status)
  }
  if (options.customerId) {
    q = q.where('customerId', '==', options.customerId)
  }

  const snap = await q.limit(500).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PipelineItem))
}

export async function getPipelineItemById(
  workspaceId: string,
  itemId: string,
): Promise<PipelineItem | null> {
  const doc = await adminDb.doc(`workspaces/${workspaceId}/pipeline/${itemId}`).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as PipelineItem
}

// Items con más de N días sin actividad — para alertas en HOY
export async function listInactivePipelineItems(
  workspaceId: string,
  minDays: number,
): Promise<PipelineItem[]> {
  const snap = await adminDb
    .collection(`workspaces/${workspaceId}/pipeline`)
    .where('status', '==', 'open')
    .where('inactiveDays', '>=', minDays)
    .orderBy('inactiveDays', 'desc')
    .limit(50)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PipelineItem))
}
