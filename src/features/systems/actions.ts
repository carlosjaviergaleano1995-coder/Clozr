'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import { requireMembership } from '@/server/auth'
import { requirePermission } from '@/server/permissions'
import { writeAuditLog } from '@/server/audit'
import { ActivateSystemSchema } from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { ActivationCode, SystemDefinitionDoc } from './types'

// ── activateSystem ────────────────────────────────────────────────────────────
// Flujo completo de activación:
// 1. Validar input
// 2. Auth + permisos (solo admin/owner puede activar)
// 3. Buscar el código en Firestore
// 4. Verificar estado y expiración
// 5. Verificar que el workspace no tenga ya un sistema activo
// 6. Cargar el SystemDefinition para copiar los flags
// 7. Transacción: activar código + escribir flags en workspace
// 8. Audit log

export async function activateSystem(
  rawInput: unknown,
): Promise<ActionResult<{ systemSlug: string; systemNombre: string }>> {
  try {
    // 1. Validar
    const result = ActivateSystemSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const { workspaceId, code } = result.data

    // 2. Auth + permisos
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'system:activate')

    // 3. Buscar el código — query por campo 'code'
    const codesSnap = await adminDb
      .collection('activation_codes')
      .where('code', '==', code.toUpperCase())
      .limit(1)
      .get()

    if (codesSnap.empty) {
      return fail('Código inválido o inexistente', 'CODE_INVALID')
    }

    const codeDoc     = codesSnap.docs[0]
    const activation  = { id: codeDoc.id, ...codeDoc.data() } as ActivationCode

    // 4. Verificar estado
    if (activation.status === 'activated') {
      if (activation.activatedAtWorkspaceId === workspaceId) {
        return fail('Este código ya está activo en este negocio', 'CODE_ALREADY_USED')
      }
      return fail('Este código ya fue usado en otro negocio', 'CODE_ALREADY_USED')
    }
    if (activation.status === 'revoked') {
      return fail('Este código fue revocado', 'CODE_INVALID')
    }
    if (activation.status === 'expired') {
      return fail('Este código expiró', 'CODE_INVALID')
    }
    if (activation.expiresAt && activation.expiresAt < new Date()) {
      return fail('Este código expiró', 'CODE_INVALID')
    }

    // 5. Cargar SystemDefinition
    const systemDoc = await adminDb
      .doc(`system_definitions/${activation.systemSlug}`)
      .get()

    if (!systemDoc.exists) {
      return fail('Sistema no encontrado', 'SYSTEM_NOT_FOUND')
    }

    const systemDef = { id: systemDoc.id, ...systemDoc.data() } as SystemDefinitionDoc

    if (!systemDef.activo) {
      return fail('Este sistema no está disponible', 'SYSTEM_NOT_FOUND')
    }

    // 6. Leer workspace para snapshot
    const wsDoc = await adminDb.doc(`workspaces/${workspaceId}`).get()
    if (!wsDoc.exists) return fail('Negocio no encontrado', 'NOT_FOUND')
    const ws = wsDoc.data()!

    // 7. Transacción atómica
    await adminDb.runTransaction(async tx => {
      // Actualizar el código de activación
      tx.update(codeDoc.ref, {
        status:                   'activated',
        activatedByUid:           user.uid,
        activatedAtWorkspaceId:   workspaceId,
        activatedAt:              FieldValue.serverTimestamp(),
        workspaceSnapshot: {
          nombre:  ws.nombre,
          ownerId: ws.ownerId,
        },
      })

      // Escribir systemFlags en el workspace (proyección de SystemFeatureFlags)
      const flags = systemDef.definition.features
      tx.update(adminDb.doc(`workspaces/${workspaceId}`), {
        activeSystemSlug:             activation.systemSlug,
        activeSystemActivatedAt:      FieldValue.serverTimestamp(),
        activeSystemActivationCodeId: codeDoc.id,
        systemFlags:                  flags,   // Record<string, boolean>
        updatedAt:                    FieldValue.serverTimestamp(),
      })
    })

    // 8. Audit
    writeAuditLog(workspaceId, user.uid, user.displayName, 'system.activated', {
      entityType: 'system',
      entityId:   activation.systemSlug,
      after: {
        systemSlug:    activation.systemSlug,
        systemVersion: activation.systemVersion,
        codeId:        codeDoc.id,
      },
    })

    revalidatePath(`/workspace/${workspaceId}`)

    return ok({
      systemSlug:   activation.systemSlug,
      systemNombre: systemDef.nombre,
    })

  } catch (err) {
    return handleActionError(err, 'activateSystem')
  }
}

// ── deactivateSystem ──────────────────────────────────────────────────────────
// Solo limpia el workspace — NO revoca el código (eso es tarea del admin panel).

export async function deactivateSystem(
  workspaceId: string,
): Promise<ActionResult> {
  try {
    const { user, membership } = await requireMembership(workspaceId)
    requirePermission(membership.role, 'system:deactivate')

    const wsDoc = await adminDb.doc(`workspaces/${workspaceId}`).get()
    if (!wsDoc.exists) return fail('Negocio no encontrado', 'NOT_FOUND')

    const ws = wsDoc.data()!
    const slug = ws.activeSystemSlug as string | undefined

    if (!slug) return fail('No hay sistema activo en este negocio', 'NOT_FOUND')

    await adminDb.doc(`workspaces/${workspaceId}`).update({
      activeSystemSlug:             FieldValue.delete(),
      activeSystemActivatedAt:      FieldValue.delete(),
      activeSystemActivationCodeId: FieldValue.delete(),
      systemFlags:                  FieldValue.delete(),
      updatedAt:                    FieldValue.serverTimestamp(),
    })

    writeAuditLog(workspaceId, user.uid, user.displayName, 'system.deactivated', {
      entityType: 'system',
      entityId:   slug,
    })

    revalidatePath(`/workspace/${workspaceId}`)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'deactivateSystem')
  }
}

// ── validateActivationCode ────────────────────────────────────────────────────
// Pre-validación sin activar — para mostrar preview antes de confirmar.

export async function validateActivationCode(
  code: string,
): Promise<ActionResult<{ systemSlug: string; systemNombre: string; systemEmoji: string }>> {
  try {
    const codesSnap = await adminDb
      .collection('activation_codes')
      .where('code', '==', code.toUpperCase().trim())
      .limit(1)
      .get()

    if (codesSnap.empty) return fail('Código inválido', 'CODE_INVALID')

    const activation = codesSnap.docs[0].data() as ActivationCode

    if (activation.status !== 'available') {
      if (activation.status === 'activated')  return fail('Este código ya fue usado', 'CODE_ALREADY_USED')
      if (activation.status === 'revoked')    return fail('Este código fue revocado', 'CODE_INVALID')
      if (activation.status === 'expired')    return fail('Este código expiró', 'CODE_INVALID')
    }

    if (activation.expiresAt && new Date(activation.expiresAt) < new Date()) {
      return fail('Este código expiró', 'CODE_INVALID')
    }

    const systemDoc = await adminDb
      .doc(`system_definitions/${activation.systemSlug}`)
      .get()

    if (!systemDoc.exists || !systemDoc.data()?.activo) {
      return fail('Sistema no disponible', 'SYSTEM_NOT_FOUND')
    }

    const sys = systemDoc.data()!
    return ok({
      systemSlug:   activation.systemSlug,
      systemNombre: sys.nombre as string,
      systemEmoji:  sys.emoji  as string,
    })

  } catch (err) {
    return handleActionError(err, 'validateActivationCode')
  }
}
