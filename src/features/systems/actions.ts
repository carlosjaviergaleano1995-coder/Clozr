import {
  collection, doc, updateDoc, getDoc, getDocs,
  query, where, limit, serverTimestamp, runTransaction, deleteField,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import { ActivateSystemSchema } from './schemas'
import type { ActivationCode, SystemDefinitionDoc } from './types'

export async function activateSystem(
  rawInput: unknown,
): Promise<ActionResult<{ systemSlug: string; systemNombre: string }>> {
  try {
    const result = ActivateSystemSchema.safeParse(rawInput)
    if (!result.success) return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    const { workspaceId, code } = result.data

    // Buscar el código
    const codesSnap = await getDocs(query(
      collection(db, 'activation_codes'),
      where('code', '==', code.toUpperCase()),
      limit(1),
    ))
    if (codesSnap.empty) return fail('Código inválido o inexistente', 'CODE_INVALID')

    const codeDoc    = codesSnap.docs[0]
    const activation = { id: codeDoc.id, ...codeDoc.data() } as ActivationCode

    if (activation.status === 'activated') {
      return fail(
        activation.activatedAtWorkspaceId === workspaceId
          ? 'Este código ya está activo en este negocio'
          : 'Este código ya fue usado en otro negocio',
        'CODE_ALREADY_USED',
      )
    }
    if (activation.status !== 'available') return fail('Código inválido o expirado', 'CODE_INVALID')
    if (activation.expiresAt && new Date(activation.expiresAt) < new Date()) {
      return fail('Este código expiró', 'CODE_INVALID')
    }

    // Cargar SystemDefinition
    const systemDoc = await getDoc(doc(db, `system_definitions/${activation.systemSlug}`))
    if (!systemDoc.exists()) return fail('Sistema no encontrado', 'SYSTEM_NOT_FOUND')
    const systemDef = systemDoc.data() as SystemDefinitionDoc
    if (!systemDef.activo) return fail('Este sistema no está disponible', 'SYSTEM_NOT_FOUND')

    // Actualizar código + workspace
    await updateDoc(codeDoc.ref, {
      status:                   'activated',
      activatedByUid:           '',
      activatedAtWorkspaceId:   workspaceId,
      activatedAt:              serverTimestamp(),
    })

    await updateDoc(doc(db, `workspaces/${workspaceId}`), {
      activeSystemSlug:        activation.systemSlug,
      activeSystemActivatedAt: serverTimestamp(),
      systemFlags:             systemDef.definition?.features ?? {},
      updatedAt:               serverTimestamp(),
    })

    return ok({ systemSlug: activation.systemSlug, systemNombre: systemDef.nombre as string })
  } catch (err) {
    return handleActionError(err, 'activateSystem')
  }
}

export async function deactivateSystem(workspaceId: string): Promise<ActionResult> {
  try {
    await updateDoc(doc(db, `workspaces/${workspaceId}`), {
      activeSystemSlug:        deleteField(),
      activeSystemActivatedAt: deleteField(),
      systemFlags:             deleteField(),
      updatedAt:               serverTimestamp(),
    })
    return ok(undefined)
  } catch (err) {
    return handleActionError(err, 'deactivateSystem')
  }
}

export async function validateActivationCode(
  code: string,
): Promise<ActionResult<{ systemSlug: string; systemNombre: string; systemEmoji: string }>> {
  try {
    const codesSnap = await getDocs(query(
      collection(db, 'activation_codes'),
      where('code', '==', code.toUpperCase().trim()),
      limit(1),
    ))
    if (codesSnap.empty) return fail('Código inválido', 'CODE_INVALID')

    const activation = codesSnap.docs[0].data() as ActivationCode
    if (activation.status !== 'available') {
      if (activation.status === 'activated') return fail('Este código ya fue usado', 'CODE_ALREADY_USED')
      return fail('Código inválido o expirado', 'CODE_INVALID')
    }
    if (activation.expiresAt && new Date(activation.expiresAt) < new Date()) {
      return fail('Este código expiró', 'CODE_INVALID')
    }

    const systemDoc = await getDoc(doc(db, `system_definitions/${activation.systemSlug}`))
    if (!systemDoc.exists() || !systemDoc.data()?.activo) {
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
