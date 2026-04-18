import { adminDb } from '@/server/firebase-admin'
import type { CatalogItem } from './types'

export async function listCatalogItems(
  workspaceId: string,
  categoria?: string,
): Promise<CatalogItem[]> {
  let q = adminDb
    .collection(`workspaces/${workspaceId}/catalog`)
    .where('activo', '==', true)
    .orderBy('orden', 'asc') as FirebaseFirestore.Query

  if (categoria) q = q.where('categoria', '==', categoria)

  const snap = await q.get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CatalogItem))
}
