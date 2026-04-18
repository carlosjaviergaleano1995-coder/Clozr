// ── WORKSPACE QUERIES ─────────────────────────────────────────────────────────
// Solo servidor — Admin SDK. Nunca importar desde 'use client'.
// Convención: get{Entity}ById, list{Entities}

import { adminDb } from '@/server/firebase-admin'
import type { Workspace, WorkspaceSummary } from './types'

export async function getWorkspaceById(id: string): Promise<Workspace | null> {
  const doc = await adminDb.doc(`workspaces/${id}`).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as Workspace
}

export async function listUserWorkspaces(userId: string): Promise<Workspace[]> {
  // Un usuario puede ser owner O miembro — buscamos por memberships
  // Para owner: index en workspaces donde ownerId == userId
  // Para miembro: hay que buscar en subcolecciones — la estrategia es
  // mantener un array workspaceIds en el User doc (o buscar members)
  // En esta versión buscamos como owner primero, luego como miembro
  const snap = await adminDb
    .collection('workspaces')
    .where('ownerId', '==', userId)
    .where('isActive', '==', true)
    .orderBy('createdAt', 'desc')
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Workspace))
}

export async function getWorkspaceSummary(
  workspaceId: string,
): Promise<WorkspaceSummary | null> {
  const doc = await adminDb
    .doc(`workspaces/${workspaceId}/aggregate/summary`)
    .get()
  if (!doc.exists) return null
  return doc.data() as WorkspaceSummary
}
