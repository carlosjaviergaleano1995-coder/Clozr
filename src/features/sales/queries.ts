import { adminDb } from '@/server/firebase-admin'
import type { Sale } from './types'

export async function listSales(
  workspaceId: string,
  options: { month?: string; customerId?: string; limit?: number } = {},
): Promise<Sale[]> {
  let q = adminDb
    .collection(`workspaces/${workspaceId}/sales`)
    .orderBy('fecha', 'desc')
    .limit(options.limit ?? 200) as FirebaseFirestore.Query

  if (options.customerId) {
    q = q.where('customerId', '==', options.customerId)
  }

  const snap = await q.get()
  let results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Sale))

  // Filtro por mes en memoria — evita índice compuesto
  if (options.month) {
    const [year, mon] = options.month.split('-').map(Number)
    results = results.filter(s => {
      const d = s.fecha instanceof Date ? s.fecha : (s.fecha as any).toDate()
      return d.getFullYear() === year && d.getMonth() + 1 === mon
    })
  }

  return results
}

export async function getSaleById(
  workspaceId: string,
  saleId: string,
): Promise<Sale | null> {
  const doc = await adminDb.doc(`workspaces/${workspaceId}/sales/${saleId}`).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Sale
}
