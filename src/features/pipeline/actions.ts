'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/server/firebase-admin'
import {
  CreatePipelineItemSchema,
  AddActivitySchema,
  UpdateStageSchema,
  ClosePipelineItemSchema,
} from './schemas'
import { ok, fail, handleActionError, parseZodError } from '@/lib/errors'
import type { ActionResult } from '@/lib/errors'
import type { PipelineItem, PipelineActivity } from './types'
import { getPipelineItemById } from './queries'

const revalidate = (wid: string) => revalidatePath(`/workspace/${wid}/pipeline`)

// ── createPipelineItem ────────────────────────────────────────────────────────

export async function createPipelineItem(
  workspaceId: string,
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const result = CreatePipelineItemSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data


    const ref = adminDb.collection(`workspaces/${workspaceId}/pipeline`).doc()
    const now = new Date()

    await ref.set({
      workspaceId,
      customerId:       input.customerId,
      customerSnapshot: input.customerSnapshot,
      stageId:          input.stageId,
      stageName:        input.stageName,
      stageOrder:       input.stageOrder,
      nextAction:       input.nextAction  ?? null,
      nextActionAt:     input.nextActionAt ?? null,
      activities:       [],
      estimatedValue:   input.estimatedValue ?? null,
      closedValue:      null,
      currency:         input.currency,
      systemData:       input.systemData ?? null,
      status:           'open',
      closedAt:         null,
      closedReason:     null,
      lastActivityAt:   FieldValue.serverTimestamp(),
      inactiveDays:     0,
      creadoPor:        '',
      createdAt:        FieldValue.serverTimestamp(),
      updatedAt:        FieldValue.serverTimestamp(),
    })

    // También actualizar lastInteractionAt del cliente
    await adminDb
      .doc(`workspaces/${workspaceId}/customers/${input.customerId}`)
      .update({ lastInteractionAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() })
      .catch(() => {/* cliente puede no existir */})

    revalidate(workspaceId)
    return ok({ id: ref.id })

  } catch (err) {
    return handleActionError(err, 'createPipelineItem')
  }
}

// ── addActivity ───────────────────────────────────────────────────────────────
// Agrega una actividad al historial del item y actualiza lastActivityAt.

export async function addActivity(
  workspaceId: string,
  pipelineItemId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = AddActivitySchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data


    const current = await getPipelineItemById(workspaceId, pipelineItemId)
    if (!current) return fail('Item no encontrado', 'NOT_FOUND')

    const activity: PipelineActivity = {
      id:              randomUUID(),
      type:            input.type,
      customType:      input.customType,
      description:     input.description,
      result:          input.result,
      performedAt:     input.performedAt ?? new Date(),
      performedBy:     '',
      performedByName: '',
    }

    await adminDb.doc(`workspaces/${workspaceId}/pipeline/${pipelineItemId}`).update({
      activities:     FieldValue.arrayUnion(activity),
      lastActivityAt: FieldValue.serverTimestamp(),
      inactiveDays:   0,
      updatedAt:      FieldValue.serverTimestamp(),
    })

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'addActivity')
  }
}

// ── updateStage ───────────────────────────────────────────────────────────────

export async function updateStage(
  workspaceId: string,
  pipelineItemId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = UpdateStageSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const input = result.data


    const current = await getPipelineItemById(workspaceId, pipelineItemId)
    if (!current) return fail('Item no encontrado', 'NOT_FOUND')

    if (current.stageId === input.stageId) return ok(undefined) // sin cambio

    const activity: PipelineActivity = {
      id:              randomUUID(),
      type:            'status_change',
      description:     `Etapa cambiada de "${current.stageName}" a "${input.stageName}"`,
      performedAt:     new Date(),
      performedBy:     '',
      performedByName: '',
    }

    // Detectar si la etapa implica cierre automático
    // Las etapas predeterminadas: cobrado/instalado → won, perdido → lost
    const WON_STAGES  = ['cobrado', 'instalado', 'cerrado']
    const LOST_STAGES = ['perdido', 'lost']
    const newStatus = WON_STAGES.includes(input.stageId)  ? 'won'
                    : LOST_STAGES.includes(input.stageId) ? 'lost'
                    : 'open'

    const updatePayload: Record<string, unknown> = {
      stageId:        input.stageId,
      stageName:      input.stageName,
      stageOrder:     input.stageOrder,
      status:         newStatus,
      activities:     FieldValue.arrayUnion(activity),
      lastActivityAt: FieldValue.serverTimestamp(),
      inactiveDays:   0,
      updatedAt:      FieldValue.serverTimestamp(),
    }

    if (newStatus !== 'open' && current.status === 'open') {
      updatePayload.closedAt = FieldValue.serverTimestamp()
    }

    await adminDb.doc(`workspaces/${workspaceId}/pipeline/${pipelineItemId}`).update(updatePayload)


    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'updateStage')
  }
}

// ── closePipelineItem ─────────────────────────────────────────────────────────

export async function closePipelineItem(
  workspaceId: string,
  pipelineItemId: string,
  rawInput: unknown,
): Promise<ActionResult> {
  try {
    const result = ClosePipelineItemSchema.safeParse(rawInput)
    if (!result.success) {
      return fail('Datos inválidos', 'VALIDATION_ERROR', parseZodError(result.error))
    }
    const { outcome, closedValue, closedReason } = result.data


    const current = await getPipelineItemById(workspaceId, pipelineItemId)
    if (!current) return fail('Item no encontrado', 'NOT_FOUND')
    if (current.status !== 'open') return fail('Este item ya está cerrado', 'FORBIDDEN')

    const activity: PipelineActivity = {
      id:              randomUUID(),
      type:            'status_change',
      description:     outcome === 'won' ? '✓ Cerrado como ganado' : '✗ Marcado como perdido',
      result:          closedReason,
      performedAt:     new Date(),
      performedBy:     '',
      performedByName: '',
    }

    await adminDb.doc(`workspaces/${workspaceId}/pipeline/${pipelineItemId}`).update({
      status:         outcome,
      closedAt:       FieldValue.serverTimestamp(),
      closedValue:    closedValue ?? null,
      closedReason:   closedReason ?? null,
      activities:     FieldValue.arrayUnion(activity),
      lastActivityAt: FieldValue.serverTimestamp(),
      updatedAt:      FieldValue.serverTimestamp(),
    })


    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'closePipelineItem')
  }
}

// ── updateNextAction ──────────────────────────────────────────────────────────

export async function updateNextAction(
  workspaceId: string,
  pipelineItemId: string,
  nextAction: string | null,
  nextActionAt: Date | null,
): Promise<ActionResult> {
  try {

    await adminDb.doc(`workspaces/${workspaceId}/pipeline/${pipelineItemId}`).update({
      nextAction:   nextAction  ?? FieldValue.delete(),
      nextActionAt: nextActionAt ?? FieldValue.delete(),
      updatedAt:    FieldValue.serverTimestamp(),
    })

    revalidate(workspaceId)
    return ok(undefined)

  } catch (err) {
    return handleActionError(err, 'updateNextAction')
  }
}
