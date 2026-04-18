// ── AUDIT LOG WRITER ──────────────────────────────────────────────────────────
// Solo escribe — nunca lee. Las lecturas se hacen directamente desde Firestore.
// Se usa en Server Actions como fire-and-forget: no bloquea la respuesta.
// El cliente NUNCA puede escribir en audit_log (reglas Firestore: write=false).

import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './firebase-admin'
import type { AuditAction } from '@/features/audit/types'

interface WriteAuditLogOptions {
  entityType?: string
  entityId?: string
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
}

export function writeAuditLog(
  workspaceId: string,
  actorUid: string,
  actorName: string,
  action: AuditAction,
  options?: WriteAuditLogOptions,
): void {
  // Fire-and-forget — no await, no bloquea el Server Action
  adminDb
    .collection(`workspaces/${workspaceId}/audit_log`)
    .add({
      workspaceId,
      actorUid,
      actorName,
      action,
      entityType: options?.entityType ?? null,
      entityId:   options?.entityId   ?? null,
      before:     options?.before     ?? null,
      after:      options?.after      ?? null,
      metadata:   options?.metadata   ?? null,
      timestamp:  FieldValue.serverTimestamp(),
    })
    .catch(err => {
      // No romper el flujo principal si el audit falla
      console.error('[audit]', action, err?.message)
    })
}
