// ── CUSTOMER QUERIES ─────────────────────────────────────────────────────────
// Solo servidor — Admin SDK. Nunca importar desde 'use client'.

import { adminDb } from '@/server/firebase-admin'
import type { Customer, CustomerStatus, CustomerType } from './types'
import { adaptClienteDoc } from './adapters'

interface ListCustomersOptions {
  estado?:    CustomerStatus
  tipo?:      CustomerType
  search?:    string          // token para array-contains
  limit?:     number
  orderBy?:   'updatedAt' | 'createdAt' | 'nombre'
}

export async function listCustomers(
  workspaceId: string,
  options: ListCustomersOptions = {},
): Promise<Customer[]> {
  let q = adminDb
    .collection(`workspaces/${workspaceId}/clientes`)
    .orderBy(options.orderBy ?? 'updatedAt', 'desc')
    .limit(options.limit ?? 200) as FirebaseFirestore.Query

  if (options.estado) {
    q = q.where('estado', '==', options.estado)
  }
  if (options.tipo) {
    q = q.where('tipo', '==', options.tipo)
  }
  if (options.search) {
    const token = options.search
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
    q = q.where('searchTokens', 'array-contains', token)
  }

  const snap = await q.get()
  return snap.docs.map(d => adaptClienteDoc(d.id, d.data()))
}

export async function getCustomerById(
  workspaceId: string,
  customerId: string,
): Promise<Customer | null> {
  const doc = await adminDb
    .doc(`workspaces/${workspaceId}/clientes/${customerId}`)
    .get()
  if (!doc.exists) return null
  return adaptClienteDoc(doc.id, doc.data()!)
}
