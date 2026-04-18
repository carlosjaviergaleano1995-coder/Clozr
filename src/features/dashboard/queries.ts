// Server-side — Admin SDK. No importar desde 'use client'.

import { adminDb } from '@/server/firebase-admin'
import type { DashboardMetrics, UpcomingAction } from './types'

// ── getDashboardMetrics ───────────────────────────────────────────────────────
// Lee el documento aggregate/summary — recalculado en background por Cloud Function.
// Si no existe, retorna zeros.

export async function getDashboardMetrics(
  workspaceId: string,
): Promise<DashboardMetrics> {
  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const doc = await adminDb
    .doc(`workspaces/${workspaceId}/aggregate/summary`)
    .get()

  if (!doc.exists) {
    return {
      salesCountThisMonth:    0,
      salesTotalARSThisMonth: 0,
      salesTotalUSDThisMonth: 0,
      pipelineOpenCount:      0,
      pipelineWonThisMonth:   0,
      customersTotal:         0,
      pipelineInactiveCount:  0,
      tasksDueToday:          0,
      month,
      updatedAt: now,
    }
  }

  const data = doc.data()!
  return {
    salesCountThisMonth:    data.totalSalesCount      ?? 0,
    salesTotalARSThisMonth: data.totalRevenueARS       ?? 0,
    salesTotalUSDThisMonth: data.totalRevenueUSD       ?? 0,
    pipelineOpenCount:      data.pipelineOpenCount     ?? 0,
    pipelineWonThisMonth:   data.pipelineWonCount      ?? 0,
    customersTotal:         data.customersCreatedCount ?? 0,
    pipelineInactiveCount:  0,  // calculado en getUpcomingActions
    tasksDueToday:          0,
    month:                  data.month ?? month,
    updatedAt:              data.updatedAt?.toDate?.() ?? now,
  }
}

// ── getUpcomingActions ────────────────────────────────────────────────────────
// Próximas acciones del pipeline para mostrar en HOY

export async function getUpcomingActions(
  workspaceId: string,
  limit = 5,
): Promise<UpcomingAction[]> {
  const now = new Date()

  const snap = await adminDb
    .collection(`workspaces/${workspaceId}/pipeline`)
    .where('status', '==', 'open')
    .where('nextActionAt', '!=', null)
    .orderBy('nextActionAt', 'asc')
    .limit(limit)
    .get()

  return snap.docs
    .map(d => {
      const data = d.data()
      const nextActionAt = data.nextActionAt?.toDate?.() ?? new Date()
      const diffMs   = nextActionAt.getTime() - now.getTime()
      const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))
      return {
        pipelineItemId: d.id,
        customerName:   data.customerSnapshot?.nombre ?? '',
        nextAction:     data.nextAction ?? '',
        nextActionAt,
        daysUntil,
      } as UpcomingAction
    })
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

// ── recalculateSummary ────────────────────────────────────────────────────────
// Recalcula el aggregate manualmente.
// En producción esto lo hace una Cloud Function on-write.
// Esta versión server-side se usa para el primer cálculo o forzar un refresh.

export async function recalculateSummary(workspaceId: string): Promise<void> {
  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // Leer sales del mes
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const salesSnap = await adminDb
    .collection(`workspaces/${workspaceId}/sales`)
    .where('fecha', '>=', startOfMonth)
    .get()

  let salesCount = 0
  let revenueARS = 0
  let revenueUSD = 0

  salesSnap.docs.forEach(d => {
    const sale = d.data()
    salesCount++
    if (sale.currency === 'ARS') revenueARS += sale.total ?? 0
    else revenueUSD += sale.total ?? 0
  })

  // Pipeline abierto
  const pipelineOpenSnap = await adminDb
    .collection(`workspaces/${workspaceId}/pipeline`)
    .where('status', '==', 'open')
    .get()

  // Pipeline ganado este mes
  const pipelineWonSnap = await adminDb
    .collection(`workspaces/${workspaceId}/pipeline`)
    .where('status', '==', 'won')
    .where('closedAt', '>=', startOfMonth)
    .get()

  // Customers total
  const wsDoc = await adminDb.doc(`workspaces/${workspaceId}`).get()
  const customerCount = wsDoc.data()?.customerCount ?? 0

  await adminDb.doc(`workspaces/${workspaceId}/aggregate/summary`).set({
    month,
    totalSalesCount:      salesCount,
    totalRevenueARS:      revenueARS,
    totalRevenueUSD:      revenueUSD,
    pipelineOpenCount:    pipelineOpenSnap.size,
    pipelineWonCount:     pipelineWonSnap.size,
    pipelineLostCount:    0,
    customersCreatedCount: customerCount,
    updatedAt:            new Date(),
  })
}
