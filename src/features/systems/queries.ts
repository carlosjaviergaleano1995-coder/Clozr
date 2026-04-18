// Server-side — Admin SDK. No importar desde 'use client'.

import { adminDb } from '@/server/firebase-admin'
import type { SystemDefinitionDoc, SalesSystemDefinition } from './types'

export async function getSystemDefinition(
  slug: string,
): Promise<SystemDefinitionDoc | null> {
  const doc = await adminDb.doc(`system_definitions/${slug}`).get()
  if (!doc.exists) return null
  return { id: doc.id, ...doc.data() } as SystemDefinitionDoc
}

// Carga la SalesSystemDefinition activa del workspace.
// Retorna null si no hay sistema activo o si el doc no existe.
export async function getSystemConfigForWorkspace(
  workspaceId: string,
): Promise<SalesSystemDefinition | null> {
  const wsDoc = await adminDb.doc(`workspaces/${workspaceId}`).get()
  if (!wsDoc.exists) return null

  const slug = wsDoc.data()?.activeSystemSlug as string | undefined
  if (!slug) return null

  const sysDef = await getSystemDefinition(slug)
  return sysDef?.definition ?? null
}

export async function listActiveSystemDefinitions(): Promise<SystemDefinitionDoc[]> {
  const snap = await adminDb
    .collection('system_definitions')
    .where('activo', '==', true)
    .get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SystemDefinitionDoc))
}
